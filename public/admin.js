const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let products = [];
let orders = [];
let inventory = [];
let selectedProductCategory = "unlu-mamuller";
let selectedInventoryCategory = "unlu-mamuller";
let expandedInventoryProductId = "";
let selectedStockAlert = "";
const productCategories = [
  ["unlu-mamuller", "Unlu Mamüller"],
  ["kuruyemisler", "Kuruyemişler"],
  ["kurabiyeler", "Kurabiyeler"],
  ["helvalar", "Helvalar"],
  ["drajeler", "Drajeler"],
  ["kolonyalar", "Kolonyalar"]
];

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
    const [productData, orderData, inventoryData] = await Promise.all([
      api("/products"),
      api("/orders"),
      api("/inventory")
    ]);

    products = productData.products || [];
    orders = orderData.orders || [];
    inventory = inventoryData.products || [];

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
  renderInventory();
  renderRecent();
}

function renderInventory() {
  const categoryProducts = inventory.filter(product => product.category === selectedInventoryCategory);
  const lowStockProducts = inventory.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 5);
  const outOfStockProducts = inventory.filter(product => Number(product.stock) <= 0);
  if (!categoryProducts.some(product => product.id === expandedInventoryProductId)) {
    expandedInventoryProductId = "";
  }

  $("#inventoryCategoryTabs").innerHTML = productCategories.map(([value, label]) => `
    <button class="category-tab ${value === selectedInventoryCategory ? "active" : ""}"
      type="button" role="tab" aria-selected="${value === selectedInventoryCategory}" data-category="${value}">
      ${label}
    </button>
  `).join("");
  $$("#inventoryCategoryTabs .category-tab").forEach(button => {
    button.onclick = () => {
      selectedInventoryCategory = button.dataset.category;
      expandedInventoryProductId = "";
      selectedStockAlert = "";
      renderInventory();
    };
  });

  $("#statLowStock").textContent = lowStockProducts.length.toLocaleString("tr-TR");
  $("#statOutOfStock").textContent = outOfStockProducts.length.toLocaleString("tr-TR");

  $$(".stock-alert-option").forEach(button => {
    const active = button.dataset.stockAlert === selectedStockAlert;
    button.classList.toggle("active", active);
    button.setAttribute("aria-expanded", String(active));
    button.onclick = () => {
      selectedStockAlert = active ? "" : button.dataset.stockAlert;
      renderInventory();
    };
  });

  const alertProducts = selectedStockAlert === "low" ? lowStockProducts : outOfStockProducts;
  const alertLabel = selectedStockAlert === "low" ? "Azalan stok" : "Stokta olmayan ürünler";
  const details = $("#stockAlertDetails");
  if (selectedStockAlert) {
    details.classList.remove("hidden");
    details.innerHTML = `
      <div class="stock-alert-details-head"><strong>${alertLabel}</strong><button type="button" class="ghost" id="closeStockAlert">Kapat</button></div>
      <ul>${alertProducts.map(product => `<li>${esc(product.name)} <span>${categoryLabel(product.category)} · ${Number(product.stock).toLocaleString("tr-TR")} adet</span></li>`).join("") || "<li>Bu durumdaki ürün yok.</li>"}</ul>
    `;
    $("#closeStockAlert").onclick = () => {
      selectedStockAlert = "";
      renderInventory();
    };
  } else {
    details.classList.add("hidden");
    details.innerHTML = "";
  }

  $("#inventoryProducts").innerHTML = categoryProducts.map(product => {
    const stock = Number(product.stock);
    const sold = Number(product.sold || 0);
    const preparing = Number(product.preparing || 0);
    const stockStatus = stock <= 0
      ? '<span class="pill stock-empty">Tükendi</span>'
      : stock <= 5
        ? '<span class="pill stock-low">Az kaldı</span>'
        : '<span class="pill stock-available">Stokta</span>';
    const expanded = product.id === expandedInventoryProductId;
    return `
      <article class="inventory-product-card ${expanded ? "expanded" : ""}">
        <button type="button" class="inventory-product-preview" data-product-id="${esc(product.id)}" aria-expanded="${expanded}">
          <span class="inventory-product-heading"><strong>${esc(product.name)}</strong>${stockStatus}</span>
          <span class="inventory-product-metrics">
            <span><small>Satılan</small><strong>${sold.toLocaleString("tr-TR")}</strong></span>
            <span><small>Mevcut stok</small><strong>${stock.toLocaleString("tr-TR")}</strong></span>
            <span><small>Hazırlanan</small><strong>${preparing.toLocaleString("tr-TR")}</strong></span>
          </span>
          <span class="inventory-product-hint">${expanded ? "Detayı gizle" : "Detayı görmek için tıkla"}</span>
        </button>
        ${expanded ? `
          <div class="inventory-product-details">
            <div><span>Satışta olan siparişlerde satılan</span><strong>${sold.toLocaleString("tr-TR")} adet</strong></div>
            <div><span>Ürün kartındaki güncel stok</span><strong>${stock.toLocaleString("tr-TR")} adet</strong></div>
            <div><span>Hazırlanıyor durumundaki siparişlerde</span><strong>${preparing.toLocaleString("tr-TR")} adet</strong></div>
            <p>${stock <= 0 ? "Stokta ürün kalmamış." : stock <= 5 ? "Stok azalmış; yeni stok girişi gerekebilir." : "Stok seviyesi normal."}</p>
          </div>
        ` : ""}
      </article>`;
  }).join("") || '<div class="inventory-empty">Bu kategoride henüz ürün yok.</div>';
  $$("#inventoryProducts .inventory-product-preview").forEach(button => {
    button.onclick = () => {
      expandedInventoryProductId = expandedInventoryProductId === button.dataset.productId ? "" : button.dataset.productId;
      renderInventory();
    };
  });
}

function renderProducts() {
  const visibleProducts = products.filter(product => product.category === selectedProductCategory);

  $("#productCategoryTabs").innerHTML = productCategories.map(([value, label]) => `
    <button class="category-tab ${value === selectedProductCategory ? "active" : ""}"
      type="button" role="tab" aria-selected="${value === selectedProductCategory}" data-category="${value}">
      ${label}
    </button>
  `).join("");
  $$("#productCategoryTabs .category-tab").forEach(button => {
    button.onclick = () => {
      selectedProductCategory = button.dataset.category;
      renderProducts();
    };
  });

  $("#productsTable").innerHTML = `
    <table class="table">
      <thead><tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th></th></tr></thead>
      <tbody>
        ${visibleProducts.map(p => `
          <tr>
            <td>${esc(p.name)}</td>
            <td>${categoryLabel(p.category)}</td>
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
        `).join("") || `<tr><td colspan="6">Bu kategoride henüz ürün yok.</td></tr>`}
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

function categoryLabel(value) {
  return ({
    "unlu-mamuller": "Unlu Mamüller",
    kuruyemisler: "Kuruyemişler",
    kurabiyeler: "Kurabiyeler",
    helvalar: "Helvalar",
    drajeler: "Drajeler",
    kolonyalar: "Kolonyalar"
  }[value] || "Kategorisiz");
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
  form.category.value = product.category || selectedProductCategory;
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
  try {
    await api(`/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  } catch (error) {
    alert(error.message);
  }
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

function toggleSidebar() {
  const sidebar = $(".sidebar");
  const expanded = sidebar.classList.toggle("expanded");
  $("#sidebarToggle").setAttribute("aria-expanded", String(expanded));
}

$("#sidebarToggle").onclick = toggleSidebar;
$("#sidebarToggle").onkeydown = event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSidebar();
  }
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
$("#refreshInventoryBtn").onclick = loadAll;
$("#closeProduct").onclick = () => $("#productDialog").close();
$("#cancelProduct").onclick = () => $("#productDialog").close();
$("#productForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const id = form.id.value;

  const body = {
    name: form.name.value.trim(),
    category: form.category.value,
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
