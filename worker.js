/**
 * Karesi Beyi - Cloudflare Worker + D1 + Static Assets
 * Ödeme sağlayıcısı bağlantısı bu sürümde bilinçli olarak eksiktir.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/products" && request.method === "GET")
        return publicProducts(env);

      if (url.pathname === "/api/checkout" && request.method === "POST")
        return checkout(request, env);

      if (url.pathname === "/api/admin/login" && request.method === "POST")
        return adminLogin(request, env);

      if (url.pathname === "/api/admin/me" && request.method === "GET")
        return adminMe(request, env);

      if (url.pathname === "/api/admin/logout" && request.method === "POST")
        return adminLogout(request, env);

      if (url.pathname === "/api/admin/products" && request.method === "GET")
        return adminProducts(request, env);

      if (url.pathname === "/api/admin/products" && request.method === "POST")
        return createProduct(request, env);

      if (url.pathname.startsWith("/api/admin/products/")) {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        if (request.method === "PUT") return updateProduct(request, env, id);
        if (request.method === "DELETE") return deleteProduct(request, env, id);
      }

      if (url.pathname === "/api/admin/orders" && request.method === "GET")
        return adminOrders(request, env);

      if (url.pathname.startsWith("/api/admin/orders/") && request.method === "PATCH") {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        return updateOrder(request, env, id);
      }

      if (url.pathname === "/api/admin/settings" && request.method === "GET")
        return adminSettings(request, env);

      if (url.pathname === "/api/admin/settings" && request.method === "PUT")
        return updateSettings(request, env);

      if (url.pathname === "/admin" || url.pathname === "/admin/")
        return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));

      if (url.pathname === "/urunler" || url.pathname === "/urunler/")
        return env.ASSETS.fetch(new Request(new URL("/products.html", request.url), request));

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "Sunucu hatası." }, 500);
    }
  }
};

async function publicProducts(env) {
  const rows = await env.DB.prepare(`
    SELECT id, name, slug, description, price, stock, image_url, active
    FROM products
    WHERE active = 1
    ORDER BY created_at DESC
  `).all();

  return json({ products: rows.results || [] });
}

async function checkout(request, env) {
  const body = await request.json();

  const customer = body?.customer;
  const items = Array.isArray(body?.items) ? body.items : [];

  if (
    !customer?.name ||
    !customer?.phone ||
    !customer?.email ||
    !customer?.city ||
    !customer?.district ||
    !customer?.address ||
    !items.length
  ) {
    return json({ error: "Müşteri ve sipariş bilgileri eksik." }, 400);
  }

  const ids = [...new Set(items.map(x => String(x.product_id || ""))).filter(Boolean)];
  if (!ids.length) return json({ error: "Sepet geçersiz." }, 400);

  const placeholders = ids.map(() => "?").join(",");
  const productRows = await env.DB.prepare(`
    SELECT id, name, price, stock, active
    FROM products
    WHERE id IN (${placeholders})
  `).bind(...ids).all();

  const productMap = new Map((productRows.results || []).map(p => [p.id, p]));
  const normalizedItems = [];

  for (const item of items) {
    const product = productMap.get(String(item.product_id));
    const qty = Math.floor(Number(item.qty));

    if (!product || !product.active) {
      return json({ error: "Sepette satışa kapalı veya bulunamayan ürün var." }, 400);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return json({ error: "Geçersiz ürün adedi." }, 400);
    }
    if (qty > Number(product.stock)) {
      return json({ error: `${product.name} için yeterli stok yok.` }, 400);
    }

    normalizedItems.push({
      product_id: product.id,
      name: product.name,
      qty,
      unit_price: Number(product.price)
    });
  }

  const total = normalizedItems.reduce(
    (sum, item) => sum + item.unit_price * item.qty,
    0
  );

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO orders
    (id, customer_name, phone, email, city, district, address, note,
     total, status, payment_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'pending', datetime('now'))
  `).bind(
    id,
    customer.name,
    customer.phone,
    customer.email,
    customer.city,
    customer.district,
    customer.address,
    customer.note || "",
    total
  ).run();

  for (const item of normalizedItems) {
    await env.DB.prepare(`
      INSERT INTO order_items
      (order_id, product_id, product_name, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      id,
      item.product_id,
      item.name,
      item.qty,
      item.unit_price
    ).run();
  }

  // Gerçek kart ödemesi burada PayTR / iyzico ile bağlanacak.
  return json({
    ok: true,
    order_id: id,
    payment_url: null,
    payment_status: "pending"
  });
}

async function adminLogin(request, env) {
  const body = await request.json();

  if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
    return json({ error: "Hatalı şifre." }, 401);
  }

  const token = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO admin_sessions (token, created_at)
    VALUES (?, datetime('now'))
  `).bind(token).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "set-cookie": cookieHeader("kb_admin", token, 86400)
    }
  });
}

async function adminMe(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);
  return json({ ok: true });
}

async function adminLogout(request, env) {
  const token = getCookie(request, "kb_admin");
  if (token) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(token).run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "set-cookie": cookieHeader("kb_admin", "", 0)
    }
  });
}

async function adminProducts(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const rows = await env.DB.prepare(`
    SELECT id, name, slug, description, price, stock, image_url, active,
           created_at, updated_at
    FROM products
    ORDER BY created_at DESC
  `).all();

  return json({ products: rows.results || [] });
}

async function createProduct(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Ürün adı zorunlu." }, 400);

  const id = crypto.randomUUID();
  const slug = await uniqueSlug(env, body.slug || name);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO products
    (id, name, slug, description, price, stock, image_url, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    name,
    slug,
    String(body.description || ""),
    safeNumber(body.price),
    safeInt(body.stock),
    String(body.image_url || ""),
    body.active === false ? 0 : 1,
    now,
    now
  ).run();

  return json({ ok: true, id });
}

async function updateProduct(request, env, id) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const body = await request.json();
  const existing = await env.DB.prepare("SELECT id FROM products WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Ürün bulunamadı." }, 404);

  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Ürün adı zorunlu." }, 400);

  const slug = await uniqueSlug(env, body.slug || name, id);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE products
    SET name = ?, slug = ?, description = ?, price = ?, stock = ?,
        image_url = ?, active = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    name,
    slug,
    String(body.description || ""),
    safeNumber(body.price),
    safeInt(body.stock),
    String(body.image_url || ""),
    body.active === false ? 0 : 1,
    now,
    id
  ).run();

  return json({ ok: true });
}

async function deleteProduct(request, env, id) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function adminOrders(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const rows = await env.DB.prepare(`
    SELECT *
    FROM orders
    ORDER BY created_at DESC
    LIMIT 200
  `).all();

  return json({ orders: rows.results || [] });
}

async function updateOrder(request, env, id) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const body = await request.json();
  const allowed = ["new", "paid", "processing", "shipped", "completed", "cancelled"];

  if (!allowed.includes(body.status)) {
    return json({ error: "Geçersiz sipariş durumu." }, 400);
  }

  await env.DB.prepare(`
    UPDATE orders SET status = ? WHERE id = ?
  `).bind(body.status, id).run();

  return json({ ok: true });
}

async function adminSettings(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const rows = await env.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows.results || []) settings[row.key] = row.value;

  return json({ settings });
}

async function updateSettings(request, env) {
  if (!await authenticated(request, env)) return json({ error: "Yetkisiz." }, 401);

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await env.DB.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(key, String(value ?? "")).run();
  }

  return json({ ok: true });
}

async function authenticated(request, env) {
  const token = getCookie(request, "kb_admin");
  if (!token) return false;

  const row = await env.DB.prepare(`
    SELECT token
    FROM admin_sessions
    WHERE token = ?
      AND datetime(created_at) > datetime('now', '-1 day')
  `).bind(token).first();

  return !!row;
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieHeader(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function uniqueSlug(env, value, excludeId = null) {
  const base = String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "urun";

  let slug = base;
  let i = 2;

  while (true) {
    const row = excludeId
      ? await env.DB.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").bind(slug, excludeId).first()
      : await env.DB.prepare("SELECT id FROM products WHERE slug = ?").bind(slug).first();

    if (!row) return slug;
    slug = `${base}-${i++}`;
  }
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function safeInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8"
    }
  });
}
