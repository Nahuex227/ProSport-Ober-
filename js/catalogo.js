/* Render del catálogo desde PS.store */
window.PS = window.PS || {};

PS.catalogo = {
  categorias: [
    { clave: "suplementos", titulo: "Suplementos y nutrición", ancla: "suplementos" },
    { clave: "indumentaria", titulo: "Indumentaria deportiva", ancla: "indumentaria" },
    { clave: "calzado", titulo: "Calzado", ancla: "calzado" },
    { clave: "equipamiento", titulo: "Equipamiento y accesorios", ancla: "equipamiento" },
  ],

  esc(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  card(producto) {
    const img = producto.imagen_url || "";
    const desc = producto.descripcion || "";
    return `
      <article class="card" data-id="${this.esc(producto.id)}" data-nombre="${this.esc(producto.nombre)}" data-precio="${producto.precio}" data-img="${this.esc(img)}">
        <img class="card-imagen" src="${this.esc(img)}" alt="${this.esc(producto.nombre)}" loading="lazy">
        <div class="card-cuerpo">
          <h3>${this.esc(producto.nombre)}</h3>
          <p class="card-meta">${this.esc(desc)}</p>
          <div class="card-pie">
            <span class="precio-producto">$${Number(producto.precio).toLocaleString("es-AR")}</span>
            <button type="button" class="boton boton-primario" style="font-size:0.85rem;padding:0.4rem 1rem;" onclick="agregarAlCarrito(this.closest('article'))">+ Carrito</button>
          </div>
        </div>
      </article>`;
  },

  renderNav() {
    const nav = document.getElementById("categorias-nav");
    if (!nav) return;
    nav.innerHTML = this.categorias
      .map(
        (c) =>
          `<a href="#${c.ancla}" class="boton boton-primario" style="font-size:0.85rem;text-decoration:none;">${this.esc(c.titulo.split(" ")[0])}</a>`
      )
      .join("");
  },

  renderProductos(lista) {
    const cont = document.getElementById("catalogo-contenedor");
    if (!cont) return;

    const porCat = {};
    lista.forEach((p) => {
      const cat = p.categoria || "otros";
      if (!porCat[cat]) porCat[cat] = [];
      porCat[cat].push(p);
    });

    let html = "";
    this.categorias.forEach((c) => {
      const items = porCat[c.clave] || [];
      if (!items.length) return;
      html += `<h2 id="${c.ancla}" class="categoria-titulo">${this.esc(c.titulo)}</h2>`;
      html += `<div class="grilla-3" style="margin-bottom:3rem;">${items.map((p) => this.card(p)).join("")}</div>`;
    });

    cont.innerHTML = html || `<p class="catalogo-intro">No hay productos disponibles.</p>`;
  },

  init() {
    if (document.body.dataset.pagina !== "productos") return;

    this.renderNav();
    const estado = document.getElementById("catalogo-estado");

    PS.store.listarProductos().then((lista) => {
      this.renderProductos(lista);
      return PS.store.estado();
    }).then((st) => {
      if (!estado) return;
      if (st.respaldo) {
        estado.hidden = false;
        estado.textContent = "Mostrando catálogo guardado (sin conexión a Supabase).";
      }
    }).catch((err) => {
      if (estado) {
        estado.hidden = false;
        estado.textContent = err.message || "No se pudo cargar el catálogo.";
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => PS.catalogo.init());
