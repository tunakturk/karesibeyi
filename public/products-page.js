const API_BASE = "";
let products = [];
let selectedCategory = "all";
let cart = JSON.parse(localStorage.getItem("kb_cart") || "[]");
const categories = [
  ["all", "Tümü"],
  ["kahve-tatli", "Kahve & Tatlı"],
  ["gurme", "Gurme Lezzetler"],
  ["atistirmalik", "Atıştırmalık"],
  ["kolonya", "Kolonya"]
];
const categoryProducts = {
  "kahve-tatli": ["kahve", "beze", "kurabiye", "draje"],
  gurme: ["midye", "tahin", "eriste", "karisik"],
  atistirmalik: ["beze", "kurabiye", "draje", "karisik"],
  kolonya: ["kolonya"]
};
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value || 0));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (match) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[match]));

function renderFilters() {
  $("#categoryFilters").innerHTML = categories.map(([id, label]) =>
    `<button class="catalog-filter ${id === selectedCategory ? "active" : ""}" data-category="${id}" type="button">${label}</button>`
  ).join("");
  document.querySelectorAll(".catalog-filter").forEach((button) => {
    button.onclick = () => {
      selectedCategory = button.dataset.category;
      renderFilters();
      renderProducts();
    };
  });
}

function renderProducts() {
  const query = $("#productSearch").value.trim().toLocaleLowerCase("tr-TR");
  const ids = selectedCategory === "all" ? null : categoryProducts[selectedCategory];
  const visible = products.filter((product) => {
    const matchesCategory = !ids || ids.includes(product.id);
    return matchesCategory && product.name.toLocaleLowerCase("tr-TR").includes(query);
  });
  $("#catalogGrid").innerHTML = visible.length ? visible.map(productCard).join("") : `<div class="catalog-empty">Aramanızla eşleşen ürün bulunamadı.</div>`;
  document.querySelectorAll(".catalog-add").forEach((button) => {
    button.onclick = () => addToCart(button.dataset.id);
  });
}

function productCard(product) {
  const canBuy = Number(product.price) > 0 && Number(product.stock) > 0;
  return `<article class="product-card">
    <div class="product-img"><img src="${escapeHtml(product.image_url || "assets/logo.png")}" alt="${escapeHtml(product.name)}"></div>
    <div class="product-info"><small>Karesi Beyi</small><h3>${escapeHtml(product.name)}</h3>
    <p class="product-description">${escapeHtml(product.description || "Özenle seçilmiş Karesi Beyi ürünü.")}</p>
    <div class="price">${Number(product.price) > 0 ? money(product.price) : "Fiyat yakında"}</div>
    <button class="add catalog-add" data-id="${escapeHtml(product.id)}" ${canBuy ? "" : "disabled"}>${canBuy ? "Sepete Ekle" : (Number(product.stock) <= 0 ? "Stokta Yok" : "Fiyat Bekleniyor")}</button></div>
  </article>`;
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product || Number(product.price) <= 0) return;
  const row = cart.find((item) => item.id === id);
  if (row) row.qty += 1;
  else cart.push({ id, qty: 1 });
  localStorage.setItem("kb_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  $("#catalogCartCount").textContent = cart.reduce((sum, row) => sum + row.qty, 0);
}

$("#productSearch").oninput = renderProducts;
$("#year").textContent = new Date().getFullYear();
$("#menuToggle").onclick = () => {
  const nav = $("#siteNav");
  const isOpen = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
};
renderFilters();
updateCartCount();
fetch(`${API_BASE}/api/products`).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ürünler yüklenemedi.");
  products = data.products || [];
  renderProducts();
}).catch((error) => {
  $("#catalogGrid").innerHTML = `<div class="catalog-empty">${escapeHtml(error.message)}</div>`;
});
