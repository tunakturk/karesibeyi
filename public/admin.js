const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let products = [];
let orders = [];

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    showLogin();
    throw new Error("Yetkisiz");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "İşlem başarısız.");
  return data;
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
}

async function boot() {
  try {
    await api("/me");
    showApp();
    await loadAll();
  } catch {
    showLogin();
  }
}

async function loadAll() {
  try {
    const [productData, orderData] = await Promise.all([
      api("/products"),
      api("/orders")
    ]);

    products = productData.products || [];
    orders = orderData.orders || [];

    $("#status").textContent = "Bağlı";
    render();
  } catch (error) {
    $("#status").textContent = error.message;
  }
}

function render() {
  $("#statProducts").textContent = products.length;
  $("#statOrders").textContent = orders.filter(x => x.status === "new").length;
  $("#statAllOrders").textContent = orders.length;
  renderProducts();
  renderOrders();
  renderRecent();
}

function renderProducts() {
  $("#productsTable").innerHTML = `
    <table class="table">
      <thead><tr><th>Ürün</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th></th></tr></thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td>${esc(p.name)}</td>
            <td>${money(p.price)}</td>
            <td>${p.stock}</td>
            <td><span class="pill">${Number(p.active) ? "Aktif" : "Pasif"}</span></td>
            <td>
              <div class="actions">
                <button class="mini" onclick="editProduct('${esc(p.id)}')">Düzenle</button>
                <button class="mini danger" onclick="deleteProduct('${esc(p.id)}')">Sil</button>
              </div>
            </td>
          </tr>
        `).join("") || `<tr><td colspan="5">Henüz ürün yok.</td></tr>`}
      </tbody>
    </table>`;
}

function renderOrders() {
  $("#ordersTable").innerHTML = `
    <table class="table">
      <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Tutar</th><th>Durum</th><th>Ödeme</th><th>Tarih</th><th></th></tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td>#${esc(o.id.slice(0, 8))}</td>
            <td>${esc(o.customer_name || "-")}</td>
            <td>${money(o.total)}</td>
            <td>
              <select onchange="setOrderStatus('${esc(o.id)}', this.value)">
                ${statusOption("new", "Yeni", o.status)}
                ${statusOption("paid", "Ödendi", o.status)}
                ${statusOption("processing", "Hazırlanıyor", o.status)}
                ${statusOption("shipped", "Kargoda", o.status)}
                ${statusOption("completed", "Tamamlandı", o.status)}
                ${statusOption("cancelled", "İptal", o.status)}
              </select>
            </td>
            <td>${esc(o.payment_status || "pending")}</td>
            <td>${date(o.created_at)}</td>
            <td><button class="mini" onclick="viewOrder('${esc(o.id)}')">Detay</button></td>
          </tr>
        `).join("") || `<tr><td colspan="7">Henüz sipariş yok.</td></tr>`}
      </tbody>
    </table>`;
}

function renderRecent() {
  $("#recentOrders").innerHTML = orders.slice(0, 5).map(o =>
    `<div class="recent-row"><strong>#${esc(o.id.slice(0, 8))}</strong> · ${esc(o.customer_name || "Müşteri")} · ${money(o.total)} <span class="pill">${esc(o.status)}</span></div>`
  ).join("") || "<div>Henüz sipariş yok.</div>";
}

function statusOption(value, label, current) {
  return `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`;
}

function money(v) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(v || 0));
}

function date(v) {
  return v ? new Date(v).toLocaleString("tr-TR") : "-";
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function openProduct(product = {}) {
  const form = $("#productForm");
  form.reset();
  form.id.value = product.id || "";
  form.name.value = product.name || "";
  form.description.value = product.description || "";
  form.price.value = product.price ?? "";
  form.stock.value = product.stock ?? 0;
  form.image_url.value = product.image_url || "";
  form.details.value = product.description || "";
  form.active.checked = Number(product.active) !== 0;
  $("#productDialogTitle").textContent = product.id ? "Ürünü düzenle" : "Yeni ürün";
  $("#productDialog").showModal();
}

window.editProduct = id => openProduct(products.find(p => p.id === id));

window.deleteProduct = async id => {
  if (!confirm("Bu ürünü silmek istediğine emin misin?")) return;
  await api(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadAll();
};

window.setOrderStatus = async (id, status) => {
  await api(`/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  await loadAll();
};

window.viewOrder = id => {
  const o = orders.find(x => x.id === id);
  if (!o) return;

  alert(
`Sipariş #${o.id.slice(0, 8)}
Müşteri: ${o.customer_name || "-"}
Telefon: ${o.phone || "-"}
E-posta: ${o.email || "-"}
İl / İlçe: ${o.city || "-"} / ${o.district || "-"}
Adres: ${o.address || "-"}
Tutar: ${money(o.total)}
Durum: ${o.status}
Ödeme: ${o.payment_status || "pending"}`
  );
};

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#loginError").textContent = "";

  try {
    await api("/login", {
      method: "POST",
      body: JSON.stringify({ password: $("#password").value })
    });

    $("#password").value = "";
    showApp();
    await loadAll();
  } catch (error) {
    $("#loginError").textContent = error.message;
  }
});

$("#logoutBtn").onclick = async () => {
  await api("/logout", { method: "POST" });
  showLogin();
};

$$(".nav-item").forEach(button => {
  button.onclick = () => {
    $$(".nav-item").forEach(x => x.classList.remove("active"));
    button.classList.add("active");
    $$(".section").forEach(section => section.classList.remove("active"));
    $(`#${button.dataset.section}`).classList.add("active");
    $("#pageTitle").textContent = button.textContent;
  };
});

$$("[data-go]").forEach(button => {
  button.onclick = () => $(`[data-section="${button.dataset.go}"]`).click();
});

$("#newProductBtn").onclick = () => openProduct();
$("#refreshOrdersBtn").onclick = loadAll;
$("#closeProduct").onclick = () => $("#productDialog").close();
$("#cancelProduct").onclick = () => $("#productDialog").close();

$("#productForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const id = form.id.value;

  const body = {
    name: form.name.value.trim(),
    description: form.details.value.trim(),
    price: Number(form.price.value),
    stock: Number(form.stock.value),
    image_url: form.image_url.value.trim(),
    active: form.active.checked
  };

  await api(`/products${id ? `/${encodeURIComponent(id)}` : ""}`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(body)
  });

  $("#productDialog").close();
  await loadAll();
});

$("#settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.currentTarget));
  await api("/settings", { method: "PUT", body: JSON.stringify(body) });
  alert("Ayarlar kaydedildi.");
});

boot();
