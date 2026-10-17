/* Panel de productos — solo cuentas de la tabla admins */
window.PS = window.PS || {};

PS.admin = {
  editando: false,
  imagenActual: "",

  esc(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  slug(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  },

  aviso(texto, ok) {
    const el = document.getElementById("admin-aviso");
    if (!el) return;
    if (!texto) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = texto;
    el.className = ok ? "cuenta-aviso cuenta-aviso--ok" : "cuenta-aviso cuenta-aviso--error";
  },

  limpiarFormulario() {
    const form = document.getElementById("form-producto");
    form.reset();
    document.getElementById("prod-id").readOnly = false;
    document.getElementById("prod-activo").checked = true;
    document.getElementById("form-titulo").textContent = "Nuevo producto";
    document.getElementById("btn-eliminar").hidden = true;
    const preview = document.getElementById("prod-preview");
    preview.hidden = true;
    preview.removeAttribute("src");
    this.editando = false;
    this.imagenActual = "";
    this.aviso("");
  },

  cargarEnFormulario(producto) {
    document.getElementById("prod-id").value = producto.id;
    document.getElementById("prod-id").readOnly = true;
    document.getElementById("prod-nombre").value = producto.nombre || "";
    document.getElementById("prod-precio").value = producto.precio ?? "";
    document.getElementById("prod-orden").value = producto.orden ?? 1;
    document.getElementById("prod-categoria").value = producto.categoria || "suplementos";
    document.getElementById("prod-descripcion").value = producto.descripcion || "";
    document.getElementById("prod-activo").checked = producto.activo !== false;
    document.getElementById("prod-foto").value = "";
    document.getElementById("form-titulo").textContent = "Editar producto";
    document.getElementById("btn-eliminar").hidden = false;
    this.editando = true;
    this.imagenActual = producto.imagen_url || "";
    const preview = document.getElementById("prod-preview");
    if (this.imagenActual) {
      preview.src = this.imagenActual;
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }
  },

  renderLista(productos) {
    const cont = document.getElementById("admin-items");
    if (!productos.length) {
      cont.innerHTML = '<p class="catalogo-intro">Todavía no hay productos.</p>';
      return;
    }
    cont.innerHTML = productos
      .map((p) => {
        const img = p.imagen_url
          ? `<img src="${this.esc(p.imagen_url)}" alt="">`
          : `<span class="admin-item__sin-foto">Sin foto</span>`;
        return `
          <button type="button" class="admin-item" data-id="${this.esc(p.id)}">
            ${img}
            <span>
              <strong>${this.esc(p.nombre)}</strong>
              <small>$${Number(p.precio).toLocaleString("es-AR")} · ${p.activo ? "visible" : "oculto"}</small>
            </span>
          </button>`;
      })
      .join("");

    cont.querySelectorAll(".admin-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prod = productos.find((p) => p.id === btn.dataset.id);
        if (prod) this.cargarEnFormulario(prod);
      });
    });
  },

  async refrescar() {
    const lista = await PS.store.listarProductosAdmin();
    this._lista = lista;
    this.renderLista(lista);
  },

  async guardar(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById("prod-id").value.trim().toLowerCase();
    const archivo = document.getElementById("prod-foto").files[0];
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Guardando…";

    try {
      let imagen = this.imagenActual || null;
      if (archivo) {
        if (archivo.size > 5 * 1024 * 1024) throw new Error("La foto no puede pesar más de 5 MB.");
        imagen = await PS.store.subirFotoProducto(archivo, id);
      }

      await PS.store.guardarProducto({
        id,
        nombre: document.getElementById("prod-nombre").value.trim(),
        precio: Number(document.getElementById("prod-precio").value),
        orden: Number(document.getElementById("prod-orden").value || 0),
        categoria: document.getElementById("prod-categoria").value,
        descripcion: document.getElementById("prod-descripcion").value.trim() || null,
        imagen_url: imagen,
        activo: document.getElementById("prod-activo").checked,
      });

      this.aviso("Producto guardado.", true);
      await this.refrescar();
      const guardado = (this._lista || []).find((p) => p.id === id);
      if (guardado) this.cargarEnFormulario(guardado);
    } catch (err) {
      const msg = /row-level security|permission/i.test(err.message || "")
        ? "Esta cuenta no tiene permiso para guardar productos."
        : err.message || "No se pudo guardar.";
      this.aviso(msg, false);
    } finally {
      btn.disabled = false;
      btn.textContent = "Guardar";
    }
  },

  async eliminar() {
    const id = document.getElementById("prod-id").value;
    if (!id || !confirm(`¿Eliminar "${id}" del catálogo?`)) return;
    try {
      await PS.store.eliminarProducto(id);
      this.limpiarFormulario();
      this.aviso("Producto eliminado.", true);
      await this.refrescar();
    } catch (err) {
      this.aviso(err.message || "No se pudo eliminar.", false);
    }
  },

  async init() {
    if (document.body.dataset.pagina !== "admin") return;
    await PS.store.ensure();

    const sesion = await PS.store.sesion();
    const admin = sesion ? await PS.store.soyAdmin() : false;
    const app = document.getElementById("admin-app");
    const bloqueado = document.getElementById("admin-bloqueado");

    if (!admin) {
      app.hidden = true;
      bloqueado.hidden = false;
      const texto = document.getElementById("admin-bloqueado-texto");
      if (sesion && texto) {
        texto.textContent = `${sesion.email} no es una cuenta administradora. Pedile a quien armó el proyecto que agregue ese email en la tabla admins.`;
      }
      return;
    }

    bloqueado.hidden = true;
    app.hidden = false;

    document.getElementById("btn-nuevo").addEventListener("click", () => this.limpiarFormulario());
    document.getElementById("form-producto").addEventListener("submit", (e) => this.guardar(e));
    document.getElementById("btn-eliminar").addEventListener("click", () => this.eliminar());
    document.getElementById("prod-nombre").addEventListener("blur", () => {
      const id = document.getElementById("prod-id");
      if (!this.editando && !id.value) id.value = this.slug(document.getElementById("prod-nombre").value);
    });
    document.getElementById("prod-foto").addEventListener("change", (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById("prod-preview");
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });

    try {
      await this.refrescar();
    } catch (err) {
      this.aviso(err.message || "No se pudo leer el catálogo.", false);
    }
  },
};

document.addEventListener("DOMContentLoaded", () => PS.admin.init());
