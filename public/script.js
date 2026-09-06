const API_BASE = "";
let products = [];
let cart = JSON.parse(localStorage.getItem("kb_cart") || "[]");
const productCategories = [
  { id: "kahve-tatli", title: "Kahve & Tatlı", products: ["kahve", "beze", "kurabiye", "draje"] },
  { id: "gurme", title: "Gurme Lezzetler", products: ["midye", "tahin", "eriste", "karisik"] },
  { id: "atistirmalik", title: "Atıştırmalık", products: ["beze", "kurabiye", "draje", "karisik"] },
  { id: "kolonya", title: "Kolonya", products: ["kolonya"] }
];

const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY"
}).format(Number(n || 0));

const saveCart = () => localStorage.setItem("kb_cart", JSON.stringify(cart));

function updateHeaderOnScroll() {
  $(".site-header").classList.toggle("scrolled", window.scrollY > 24);
}

async function loadProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ürünler yüklenemedi.");
  products = data.products || [];

  cart = cart.filter(row => {
    const p = products.find(x => x.id === row.id);
    return p && p.active && Number(p.stock) > 0;
  });

  saveCart();
  renderProducts();
  renderCart();
}

function renderProducts() {
  const el = $("#productGrid");
  if (!products.length) {
    el.innerHTML = `<div class="empty">Henüz satışa açık ürün bulunmuyor.</div>`;
    return;
  }

  el.innerHTML = productCategories.map((category) => {
    const categoryProducts = shuffle(products.filter((product) => category.products.includes(product.id)));
    if (!categoryProducts.length) return "";
    const cards = categoryProducts.map(productCard).join("");
    const isScrollable = categoryProducts.length > 1;
    return `
      <section class="product-rail" aria-labelledby="category-${category.id}">
        <div class="rail-heading">
          <h3 id="category-${category.id}">${category.title}</h3>
          <span>Özenle seçildi</span>
        </div>
        <div class="rail-window ${isScrollable ? "" : "single-product"}">
          <div class="rail-track">${isScrollable ? cards + cards : cards}</div>
        </div>
      </section>
    `;
  }).join("");
}

function productCard(p) {
    const canBuy = Number(p.price) > 0 && Number(p.stock) > 0;

    return `
      <article class="product-card">
        <div class="product-img">
          <img src="${escapeHtml(p.image_url || "assets/logo.png")}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="product-info">
          <small>Karesi Beyi</small>
          <h3>${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="product-description">${escapeHtml(p.description)}</p>` : ""}
          <div class="price">${Number(p.price) > 0 ? money(p.price) : "Fiyat yakında"}</div>
          <button class="add" ${canBuy ? "" : "disabled"} onclick="addToCart('${escapeHtml(p.id)}')">
            ${canBuy ? "Sepete Ekle" : (Number(p.stock) <= 0 ? "Stokta Yok" : "Fiyat Bekleniyor")}
          </button>
        </div>
      </article>
    `;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p || Number(p.price) <= 0) return;

  const row = cart.find(x => x.id === id);
  if (row) row.qty += 1;
  else cart.push({ id, qty: 1 });

  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  const row = cart.find(x => x.id === id);
  const p = products.find(x => x.id === id);
  if (!row || !p) return;

  row.qty += delta;
  if (row.qty <= 0) cart = cart.filter(x => x.id !== id);
  if (row.qty > Number(p.stock)) row.qty = Number(p.stock);

  saveCart();
  renderCart();
}

function renderCart() {
  const el = $("#cartItems");
  let total = 0;
  let count = 0;

  if (!cart.length) {
    el.innerHTML = `<div class="empty">Sepetiniz boş.</div>`;
  } else {
    el.innerHTML = cart.map(row => {
      const p = products.find(x => x.id === row.id);
      if (!p) return "";

      total += Number(p.price) * row.qty;
      count += row.qty;

      return `
        <div class="cart-row">
          <img src="${escapeHtml(p.image_url || "assets/logo.png")}" alt="">
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <div class="qty">
              <button onclick="changeQty('${escapeHtml(p.id)}',-1)">−</button>
              ${row.qty}
              <button onclick="changeQty('${escapeHtml(p.id)}',1)">+</button>
            </div>
          </div>
          <strong>${money(Number(p.price) * row.qty)}</strong>
        </div>
      `;
    }).join("");
  }

  $("#cartTotal").textContent = money(total);
  $("#cartCount").textContent = count;
  $("#checkoutBtn").disabled = !cart.length;
}

function openCart() {
  $("#cartDrawer").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  $("#cartDrawer").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden", "true");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

$("#openCart").onclick = openCart;
$("#closeCart").onclick = closeCart;
window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
updateHeaderOnScroll();
$("#menuToggle").onclick = () => {
  const nav = $("#siteNav");
  const isOpen = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
  $("#menuToggle").setAttribute("aria-label", isOpen ? "Menüyü kapat" : "Menüyü aç");
};
document.querySelectorAll("#siteNav a").forEach((link) => {
  link.onclick = () => {
    $("#siteNav").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
    $("#menuToggle").setAttribute("aria-label", "Menüyü aç");
  };
});

$("#checkoutBtn").onclick = () => {
  closeCart();
  $("#checkoutModal").classList.add("open");
};

$("#closeCheckout").onclick = () => {
  $("#checkoutModal").classList.remove("open");
};

$("#checkoutForm").onsubmit = async (event) => {
  event.preventDefault();

  const msg = $("#checkoutMessage");
  msg.className = "";
  msg.textContent = "Sipariş hazırlanıyor...";

  const customer = Object.fromEntries(new FormData(event.target).entries());
  const items = cart.map(row => ({
    product_id: row.id,
    qty: row.qty
  }));

  try {
    const res = await fetch(`${API_BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items })
    });

    const out = await res.json();

    if (!res.ok) throw new Error(out.error || "Sipariş oluşturulamadı.");

    if (out.payment_url) {
      location.href = out.payment_url;
      return;
    }

    msg.className = "success";
    msg.textContent = `Siparişiniz alındı. Sipariş numaranız: ${out.order_id}`;

    cart = [];
    saveCart();
    renderCart();
    event.target.reset();
  } catch (error) {
    msg.className = "error";
    msg.textContent = error.message;
  }
};

$("#year").textContent = new Date().getFullYear();

loadProducts().catch((error) => {
  $("#productGrid").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});
