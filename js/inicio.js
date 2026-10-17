/* Portada: cuenta y vitrina desde el catálogo real */
window.PS = window.PS || {};

PS.inicio = {
  etiquetas: {
    suplementos: "Suplementos",
    indumentaria: "Indumentaria",
    calzado: "Calzado",
    equipamiento: "Equipamiento",
    accesorios: "Accesorios",
  },

  esc(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  pieza(producto) {
    const img = producto.imagen_url || "";
    const cat = this.etiquetas[producto.categoria] || "Catálogo";
    const precio = Number(producto.precio).toLocaleString("es-AR");
    return `
      <article class="pieza" data-id="${this.esc(producto.id)}" data-nombre="${this.esc(producto.nombre)}" data-precio="${producto.precio}" data-img="${this.esc(img)}">
        <div class="pieza-foto">
          <img src="${this.esc(img)}" alt="${this.esc(producto.nombre)}" loading="lazy">
        </div>
        <div class="pieza-info">
          <p class="pieza-cat">${this.esc(cat)}</p>
          <h3>${this.esc(producto.nombre)}</h3>
          <div class="pieza-pie">
            <span class="precio-producto">$${precio}</span>
            <button type="button" class="boton boton-primario pieza-agregar" onclick="agregarAlCarrito(this.closest('article'))">Agregar</button>
          </div>
        </div>
      </article>`;
  },

  init() {
    if (document.body.dataset.pagina !== "inicio") return;
    const cont = document.getElementById("home-vitrina");
    const cantidad = document.getElementById("home-cantidad");
    if (!cont || !window.PS.store) return;

    PS.store.listarProductos().then((lista) => {
      const activos = (lista || []).filter((p) => p && p.activo !== false);
      if (cantidad) cantidad.textContent = String(activos.length);
      const destacados = activos.slice(0, 4);
      cont.innerHTML = destacados.length
        ? destacados.map((p) => this.pieza(p)).join("")
        : '<p class="catalogo-intro">Todavía no hay productos en la vitrina.</p>';
    }).catch(() => {
      cont.innerHTML = '<p class="catalogo-intro">No se pudo cargar la vitrina. Entrá al catálogo para ver los productos.</p>';
    });
  },
};

document.addEventListener("DOMContentLoaded", () => PS.inicio.init());
