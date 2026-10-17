/* ProSport Oberá — carrito y UI compartida */

window.PS = window.PS || {};

const cfg = PS.config || { claveCarrito: "prosport.carrito.v1" };
let carrito = [];

function claveCarrito() {
  return cfg.claveCarrito || "prosport.carrito.v1";
}

function cargarCarrito() {
  try {
    const raw = localStorage.getItem(claveCarrito());
    carrito = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(carrito)) carrito = [];
  } catch {
    carrito = [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem(claveCarrito(), JSON.stringify(carrito));
  } catch {
    /* storage lleno o modo privado */
  }
}

function esc(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarToast(mensaje) {
  let el = document.getElementById("ps-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "ps-toast";
    el.className = "ps-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = mensaje;
  el.classList.add("ps-toast--visible");
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => el.classList.remove("ps-toast--visible"), 2600);
}

function asegurarUICarrito() {
  if (document.getElementById("panel-carrito")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button type="button" id="btn-carrito" class="btn-carrito-flotante" onclick="toggleCarrito()" aria-label="Abrir carrito">
      Mi carrito
      <span class="badge" id="carrito-count">0</span>
    </button>
    <div id="overlay-carrito" class="overlay-carrito" onclick="toggleCarrito()" hidden></div>
    <aside id="panel-carrito" class="panel-carrito" aria-label="Carrito de compras" aria-hidden="true">
      <div class="carrito-header">
        <h3>Tu carrito</h3>
        <button type="button" class="carrito-cerrar" onclick="toggleCarrito()" aria-label="Cerrar">&times;</button>
      </div>
      <div class="carrito-items" id="carrito-items">
        <p id="carrito-vacio" class="carrito-vacio">El carrito está vacío.</p>
      </div>
      <div class="carrito-footer">
        <div class="carrito-total">Total: <span id="carrito-total">$0</span></div>
        <a href="carrito.html" class="boton boton-primario boton-ancho" onclick="toggleCarrito()">Ir a checkout</a>
        <button type="button" class="boton-link" onclick="vaciarCarrito()">Vaciar carrito</button>
      </div>
    </aside>`
  );
}

function totalesCarrito() {
  const items = carrito.reduce((s, i) => s + i.cantidad, 0);
  const precio = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  return { items, precio };
}

function renderListaCarrito(contenedor, vacioEl) {
  if (!contenedor) return;
  contenedor.querySelectorAll(".carrito-item").forEach((el) => el.remove());

  carrito.forEach((item) => {
    const esDel = item.cantidad === 1;
    const d = document.createElement("div");
    d.className = "carrito-item";
    const imgHtml = item.img
      ? `<img class="carrito-item-img" src="${esc(item.img)}" alt="" loading="lazy">`
      : "";
    d.innerHTML = `
      ${imgHtml}
      <div class="carrito-item-info">
        <h4>${esc(item.nombre)}</h4>
        <p>$${(item.precio * item.cantidad).toLocaleString("es-AR")}</p>
      </div>
      <div class="carrito-item-controles">
        <button type="button" onclick="cambiarCantidad('${esc(item.id)}',-1)" class="${esDel ? "btn-quitar" : ""}" aria-label="Quitar uno">${esDel ? "&times;" : "-"}</button>
        <span>${item.cantidad}</span>
        <button type="button" onclick="cambiarCantidad('${esc(item.id)}',1)" aria-label="Agregar uno">+</button>
      </div>`;
    if (vacioEl) contenedor.insertBefore(d, vacioEl);
    else contenedor.appendChild(d);
  });
}

function actualizarCarrito() {
  const { items, precio } = totalesCarrito();
  const badge = document.getElementById("carrito-count");
  const navBadge = document.getElementById("nav-carrito-count");
  const totEl = document.getElementById("carrito-total");
  const totPagina = document.getElementById("carrito-total-pagina");
  const vacio = document.getElementById("carrito-vacio");
  const vacioPagina = document.getElementById("carrito-vacio-pagina");
  const resumenCheckout = document.getElementById("checkout-resumen-total");

  if (badge) badge.textContent = items;
  if (navBadge) {
    navBadge.textContent = items;
    navBadge.hidden = items === 0;
  }
  if (totEl) totEl.textContent = "$" + precio.toLocaleString("es-AR");
  if (totPagina) totPagina.textContent = "$" + precio.toLocaleString("es-AR");
  if (resumenCheckout) resumenCheckout.textContent = "$" + precio.toLocaleString("es-AR");

  if (vacio) vacio.hidden = carrito.length > 0;
  if (vacioPagina) vacioPagina.hidden = carrito.length > 0;

  renderListaCarrito(document.getElementById("carrito-items"), vacio);
  renderListaCarrito(document.getElementById("carrito-pagina-items"), vacioPagina);

  const btnConfirmar = document.getElementById("btn-confirmar-pedido");
  if (btnConfirmar) btnConfirmar.disabled = carrito.length === 0;

  guardarCarrito();
}

function agregarAlCarrito(article) {
  if (!article) return;
  const id = article.dataset.id;
  const nombre = article.dataset.nombre;
  const precio = parseInt(article.dataset.precio, 10);
  const imgEl = article.querySelector("img");
  const img = article.dataset.img || (imgEl ? imgEl.getAttribute("src") : "");

  if (!id || !nombre || Number.isNaN(precio)) return;

  const exist = carrito.find((i) => i.id === id);
  if (exist) exist.cantidad++;
  else carrito.push({ id, nombre, precio, img, cantidad: 1 });

  actualizarCarrito();
  mostrarToast("Producto agregado al carrito");
  abrirCarrito();
}

function cambiarCantidad(id, delta) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter((i) => i.id !== id);
  actualizarCarrito();
}

function vaciarCarrito() {
  if (carrito.length && !confirm("¿Vaciar el carrito?")) return;
  carrito = [];
  actualizarCarrito();
}

function toggleCarrito() {
  const panel = document.getElementById("panel-carrito");
  const overlay = document.getElementById("overlay-carrito");
  if (!panel || !overlay) return;
  const abierto = panel.classList.toggle("abierto");
  overlay.hidden = !abierto;
  panel.setAttribute("aria-hidden", abierto ? "false" : "true");
  document.body.classList.toggle("carrito-abierto", abierto);
}

function abrirCarrito() {
  const panel = document.getElementById("panel-carrito");
  if (panel && !panel.classList.contains("abierto")) toggleCarrito();
}

async function confirmarPedido(datosCliente) {
  if (carrito.length === 0) {
    mostrarToast("Agregá productos antes de confirmar");
    return false;
  }

  const total = totalesCarrito().precio;
  const items = carrito.map((i) => ({ ...i }));
  const btn = document.getElementById("btn-confirmar-pedido");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando pedido…";
  }

  try {
    const pedido = await PS.store.crearPedido(datosCliente, items, total);
    const lineas = items
      .map(
        (i) =>
          `${i.cantidad}x ${i.nombre}: $${(i.precio * i.cantidad).toLocaleString("es-AR")}`
      )
      .join("\n");

    mostrarToast("Pedido guardado en Supabase");
    alert(
      `¡Pedido confirmado!\n\nNº ${pedido.id}\n\n${lineas}\n\nTotal: $${total.toLocaleString("es-AR")}\n\nTe contactaremos para coordinar pago y entrega.`
    );

    carrito = [];
    actualizarCarrito();
    document.getElementById("form-checkout")?.reset();

    const panel = document.getElementById("panel-carrito");
    if (panel?.classList.contains("abierto")) toggleCarrito();
    return true;
  } catch (err) {
    mostrarToast(err.message || "No se pudo guardar el pedido");
    return false;
  } finally {
    if (btn) {
      btn.textContent = "Confirmar pedido";
      btn.disabled = carrito.length === 0;
    }
  }
}

function initNavMovil() {
  const btn = document.querySelector("[data-accion='menu']");
  const nav = document.getElementById("nav-principal");
  if (!btn || !nav) return;

  btn.textContent = "Menú";

  if (!nav.querySelector(".menu-cabecera")) {
    nav.insertAdjacentHTML(
      "afterbegin",
      `<div class="menu-cabecera">
        <strong>ProSport Oberá</strong>
        <button type="button" class="menu-cerrar" aria-label="Cerrar menú">&times;</button>
      </div>`
    );
  }

  let overlay = document.getElementById("menu-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "menu-overlay";
    overlay.className = "menu-overlay";
    overlay.hidden = true;
    document.body.appendChild(overlay);
  }

  const setAbierto = (abierto) => {
    nav.classList.toggle("abierto", abierto);
    overlay.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    document.body.classList.toggle("menu-abierto", abierto);
  };

  btn.addEventListener("click", () => setAbierto(!nav.classList.contains("abierto")));
  overlay.addEventListener("click", () => setAbierto(false));
  nav.querySelector(".menu-cerrar")?.addEventListener("click", () => setAbierto(false));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setAbierto(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setAbierto(false);
  });
}

function marcarNavActiva() {
  const pagina = document.body.dataset.pagina;
  if (!pagina) return;
  document.querySelectorAll(".site-nav a[data-nav]").forEach((a) => {
    a.classList.toggle("activo", a.dataset.nav === pagina);
  });
}

function prefillCheckoutEmail(email) {
  const form = document.getElementById("form-checkout");
  if (!form || !email) return;
  const campo = form.querySelector('[name="email"]');
  if (campo && !campo.value) campo.value = email;
}

function initCheckoutModo() {
  if (document.body.dataset.pagina !== "carrito") return;

  PS.auth.mostrarAvisoEntorno();

  const form = document.getElementById("form-checkout");
  const authBox = document.getElementById("checkout-auth");
  const sesionOk = document.getElementById("checkout-sesion-ok");
  const panelLogin = document.getElementById("checkout-panel-login");
  const panelReg = document.getElementById("checkout-panel-registro");
  const aviso = document.getElementById("checkout-auth-aviso");
  const radios = document.querySelectorAll('input[name="checkout-modo"]');
  const opciones = authBox?.querySelector(".checkout-modo-opciones");

  const setFormVisible = (visible) => {
    if (form) form.hidden = !visible;
  };

  const applyModo = async () => {
    const sesion = await PS.store.sesion();
    if (sesion) {
      if (opciones) opciones.hidden = true;
      if (sesionOk) {
        sesionOk.hidden = false;
        sesionOk.textContent = `Comprando como ${sesion.email}. El pedido aparecerá en Mis pedidos.`;
      }
      if (panelLogin) panelLogin.hidden = true;
      if (panelReg) panelReg.hidden = true;
      setFormVisible(true);
      prefillCheckoutEmail(sesion.email);
      return;
    }

    if (opciones) opciones.hidden = false;
    const modo = document.querySelector('input[name="checkout-modo"]:checked')?.value || "invitado";
    if (sesionOk) sesionOk.hidden = true;
    if (panelLogin) panelLogin.hidden = modo !== "login";
    if (panelReg) panelReg.hidden = modo !== "registro";
    setFormVisible(modo === "invitado");

    if (modo === "login") void PS.captcha.montar("turnstile-checkout-login");
    if (modo === "registro") void PS.captcha.montar("turnstile-checkout-registro");
  };

  radios.forEach((r) => r.addEventListener("change", () => void applyModo()));

  document.getElementById("form-checkout-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("co-login-email")?.value;
    const clave = document.getElementById("co-login-clave")?.value;
    try {
      await PS.auth.entrar(email, clave, "turnstile-checkout-login");
      if (aviso) aviso.hidden = true;
      await applyModo();
    } catch (err) {
      if (aviso) {
        aviso.hidden = false;
        aviso.textContent = PS.auth.mensajeError(err);
      }
      PS.captcha.reset("turnstile-checkout-login");
    }
  });

  document.getElementById("form-checkout-registro")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("co-reg-email")?.value;
    const clave = document.getElementById("co-reg-clave")?.value;
    try {
      await PS.auth.registrar(email, clave, "turnstile-checkout-registro");
      if (aviso) {
        aviso.hidden = false;
        aviso.className = "cuenta-aviso cuenta-aviso--ok";
        aviso.textContent = "Cuenta creada. Si Supabase pide confirmación de email, revisá tu bandeja y luego ingresá.";
      }
      document.querySelector('input[name="checkout-modo"][value="login"]')?.click();
      const loginEmail = document.getElementById("co-login-email");
      if (loginEmail) loginEmail.value = email;
    } catch (err) {
      if (aviso) {
        aviso.hidden = false;
        aviso.className = "cuenta-aviso cuenta-aviso--error";
        aviso.textContent = PS.auth.mensajeError(err);
      }
      PS.captcha.reset("turnstile-checkout-registro");
    }
  });

  PS.store.ensure().then(() => applyModo());
}

function initCheckout() {
  const form = document.getElementById("form-checkout");
  if (!form) return;

  if (window.PS?.store?.sesion) {
    PS.store.sesion().then((s) => {
      if (s) prefillCheckoutEmail(s.email);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    void confirmarPedido({
      nombre: fd.get("nombre"),
      email: fd.get("email"),
      telefono: fd.get("telefono"),
      entrega: fd.get("entrega"),
      direccion: fd.get("direccion"),
      notas: fd.get("notas"),
    });
  });
}

function init() {
  cargarCarrito();
  asegurarUICarrito();
  actualizarCarrito();
  initNavMovil();
  marcarNavActiva();
  initCheckoutModo();
  initCheckout();
}

document.addEventListener("DOMContentLoaded", init);
