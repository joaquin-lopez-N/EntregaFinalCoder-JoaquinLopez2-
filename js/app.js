// ProyectoFinalLopezNavoni – Mini Ecommerce con carrito
// JSON asíncrono, HTML generado desde JS, SweetAlert2, flujo de compra, localStorage.

(function () {
  "use strict";

  // ===== Utilidades =====
  const fmtARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
  const $ = (sel) => document.querySelector(sel);

  const STORAGE_KEY = "pf-cart";

  // Fallback si fetch falla (por abrir file://)
  const FALLBACK_PRODUCTS = [
    { id: 1, name: "Poké Ball", price: 1800, image: "./assets/poke-ball.jpeg", stock: 30 },
    { id: 2, name: "Poción", price: 2200, image: "./assets/pocion.jpeg", stock: 20 },
    { id: 3, name: "Super Ball", price: 4200, image: "./assets/super-ball.jpeg", stock: 15 },
    { id: 4, name: "Antídoto", price: 1500, image: "./assets/antidoto.jpeg", stock: 18 },
    { id: 5, name: "Revivir", price: 8900, image: "./assets/revivir.png", stock: 8 },
    { id: 6, name: "Ultra Ball", price: 9800, image: "./assets/ultraball.jpeg", stock: 6 },
  ];

  // ===== Modelo: Carrito =====
  class Cart {
    constructor(items = []) { this.items = items; }
    add(product, qty = 1) {
      const i = this.items.findIndex((x) => x.id === product.id);
      if (i >= 0) this.items[i].qty = Math.min(this.items[i].qty + qty, 99);
      else this.items.push({ id: product.id, name: product.name, price: product.price, qty: Math.min(qty, 99) });
      this.persist();
    }
    update(id, qty) {
      const it = this.items.find((x) => x.id === id);
      if (!it) return;
      const n = Math.max(1, Math.min(parseInt(qty || 1, 10), 99));
      it.qty = n;
      this.persist();
    }
    remove(id) { this.items = this.items.filter((x) => x.id !== id); this.persist(); }
    clear() { this.items = []; this.persist(); }
    total() { return this.items.reduce((acc, it) => acc + it.price * it.qty, 0); }
    count() { return this.items.reduce((acc, it) => acc + it.qty, 0); }
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); renderCart(); }
    static fromStorage() {
      try { return new Cart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
      catch { return new Cart([]); }
    }
  }

  // ===== Estado =====
  let state = { products: [], cart: Cart.fromStorage() };

  // ===== Datos =====
  async function loadProducts() {
    try {
      const res = await fetch("./data/products.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("JSON inválido");
      return data;
    } catch {
      // fallback para entorno file://
      return new Promise((r) => setTimeout(() => r(FALLBACK_PRODUCTS), 200));
    }
  }

  // ===== Render catálogo =====
  function renderProducts(products) {
    const grid = $("#product-grid");
    grid.innerHTML = products
      .map(
        (p) => `
      <div class="col-12 col-sm-6 col-md-4">
        <div class="card card-product h-100 shadow-sm">
          <img src="${p.image}" class="card-img-top" alt="${p.name}">
          <div class="card-body d-flex flex-column">
            <h3 class="h6">${p.name}</h3>
            <p class="text-muted mb-2">${fmtARS.format(p.price)}</p>
            <button class="btn btn-primary mt-auto" data-add="${p.id}">Agregar</button>
          </div>
        </div>
      </div>`
      )
      .join("");

    // Delegación (solo se registra una vez porque renderProducts se llama en init)
    grid.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-add]");
      if (!btn) return;
      const id = Number(btn.getAttribute("data-add"));
      const prod = state.products.find((p) => p.id === id);
      if (!prod) return;
      state.cart.add(prod, 1);
      Swal.fire({ toast: true, position: "top-end", timer: 1200, showConfirmButton: false, icon: "success", title: `${prod.name} agregado` });
    });
  }

  // ===== Render carrito =====
  function renderCart() {
    const cont = $("#cart-container");
    const totalEl = $("#cart-total");
    const countEl = $("#cart-count");

    if (state.cart.items.length === 0) {
      cont.innerHTML = '<p class="text-muted m-0">Tu carrito está vacío.</p>';
      totalEl.textContent = fmtARS.format(0);
      countEl.textContent = "0";
      // limpiar handlers para no duplicar
      cont.onclick = null;
      cont.onchange = null;
      return;
    }

    const rows = state.cart.items
      .map(
        (it) => `
      <tr>
        <td class="w-50">${it.name}</td>
        <td>${fmtARS.format(it.price)}</td>
        <td>
          <input type="number" min="1" max="99" value="${it.qty}" class="form-control form-control-sm qty-input" data-qty="${it.id}">
        </td>
        <td class="text-end">${fmtARS.format(it.price * it.qty)}</td>
        <td class="text-end">
          <button class="btn btn-outline-secondary btn-sm" title="Quitar" data-remove="${it.id}">✕</button>
        </td>
      </tr>`
      )
      .join("");

    cont.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-cart align-middle">
          <thead>
            <tr><th>Producto</th><th>Precio</th><th>Cant.</th><th class="text-end">Subtotal</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    totalEl.textContent = fmtARS.format(state.cart.total());
    countEl.textContent = String(state.cart.count());

    // Handlers SIN duplicar (asignación directa)
    cont.onchange = (ev) => {
      const inp = ev.target.closest("[data-qty]");
      if (!inp) return;
      const id = Number(inp.getAttribute("data-qty"));
      state.cart.update(id, inp.value);
    };
    cont.onclick = (ev) => {
      const btn = ev.target.closest("[data-remove]");
      if (!btn) return;
      const id = Number(btn.getAttribute("data-remove"));
      state.cart.remove(id);
      Swal.fire({ toast: true, position: "top-end", timer: 1100, showConfirmButton: false, icon: "info", title: "Producto eliminado" });
    };
  }

  function hookGlobalActions() {
    $("#btn-empty").addEventListener("click", async () => {
      const r = await Swal.fire({
        icon: "warning",
        title: "Vaciar carrito",
        text: "¿Seguro que querés eliminar todos los productos?",
        showCancelButton: true,
        confirmButtonText: "Sí, vaciar",
        cancelButtonText: "Cancelar",
      });
      if (r.isConfirmed) state.cart.clear();
    });

    
    $("#btn-checkout").addEventListener("click", async () => {
      if (state.cart.items.length === 0) {
        await Swal.fire({ icon: "info", title: "Carrito vacío", text: "Agregá productos antes de comprar." });
        return;
      }

      const formHTML = `
        <form id="checkout-form" class="text-start">
          <div class="mb-2">
            <label class="form-label">Nombre</label>
            <input id="f-name" class="form-control" value="Joaquín Uriel López Navoni" required>
          </div>
          <div class="mb-2">
            <label class="form-label">Email</label>
            <input id="f-email" type="email" class="form-control" value="joaquin@example.com" required>
          </div>
          <div class="mb-2">
            <label class="form-label">Dirección</label>
            <input id="f-addr" class="form-control" value="Av. Siempre Viva 742" required>
          </div>
          <div class="mb-2">
            <label class="form-label">Pago</label>
            <select id="f-pay" class="form-select">
              <option>Tarjeta de crédito</option>
              <option>Tarjeta de débito</option>
              <option>Transferencia</option>
              <option>Mercado Pago</option>
            </select>
          </div>
        </form>
      `;

      const result = await Swal.fire({
        title: "Finalizar compra",
        html: formHTML,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Pagar",
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          const name = document.getElementById("f-name").value.trim();
          const email = document.getElementById("f-email").value.trim();
          const addr = document.getElementById("f-addr").value.trim();
          const pay = document.getElementById("f-pay").value;
          if (!name || !email || !addr) {
            Swal.showValidationMessage("Completá nombre, email y dirección");
            return false;
          }
          return { name, email, addr, pay };
        },
      });

      if (result.isConfirmed) {
        const orderId = Math.floor(Math.random() * 900000 + 100000).toString();
        const total = fmtARS.format(state.cart.total());
        const resumen = state.cart.items.map((it) => `${it.qty}× ${it.name}`).join(", ");

        state.cart.clear();

        await Swal.fire({
          icon: "success",
          title: "¡Compra realizada!",
          html: `
            <p class="mb-2">Orden <b>#${orderId}</b></p>
            <p class="mb-2">Productos: ${resumen}</p>
            <p class="mb-0">Total pagado: <b>${total}</b></p>
          `,
        });
      }
    });
  }

  // ===== Init =====
  async function init() {
    state.products = await loadProducts();
    renderProducts(state.products);
    renderCart();
    hookGlobalActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
