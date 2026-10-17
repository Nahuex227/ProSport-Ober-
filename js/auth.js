/* Auth: email/contraseña + Google OAuth (Supabase Auth) */
window.PS = window.PS || {};

PS.auth = {
  async ensureClient() {
    const ok = await PS.store.ensure();
    if (!ok) throw new Error("No hay conexión con Supabase. Revisá internet o config.js.");
  },

  esArchivoLocal() {
    return window.location.protocol === "file:";
  },

  urlRedirect() {
    const cfg = PS.config.auth || {};
    const base = (cfg.baseUrl || "").trim();
    if (base && /^https?:\/\//i.test(base)) {
      return base.replace(/\/?$/, "/") + (cfg.redirectPath || "cuenta.html");
    }
    if (this.esArchivoLocal()) return null;
    if (typeof window !== "undefined" && window.location.origin) {
      const path = window.location.pathname.replace(/[^/]+$/, "");
      return window.location.origin + path + (cfg.redirectPath || "cuenta.html");
    }
    return null;
  },

  mostrarAvisoEntorno() {
    const id = "aviso-entorno-local";
    if (!this.esArchivoLocal() && this.urlRedirect()) return;
    if (document.getElementById(id)) return;
    const div = document.createElement("div");
    div.id = id;
    div.className = "cuenta-aviso cuenta-aviso--error";
    div.innerHTML =
      "<strong>No uses file://</strong> para registrarte o Google. Abrí el sitio con <strong>Live Server</strong> y ajustá <code>auth.baseUrl</code> en config.js (ej. http://127.0.0.1:5500/sitio-base/).";
    document.querySelector("main .contenedor")?.prepend(div);
  },

  async actualizarNav() {
    const link = document.getElementById("nav-cuenta-link");
    if (!link) return;
    const sesion = await PS.store.sesion();
    if (sesion) {
      link.textContent = "Mi cuenta";
      link.href = "cuenta.html";
    } else {
      link.textContent = "Ingresar";
      link.href = "cuenta.html";
    }
  },

  mensajeError(err) {
    const m = err?.message || String(err);
    if (/invalid login credentials/i.test(m)) return "Email o contraseña incorrectos.";
    if (/email not confirmed/i.test(m)) return "Confirmá tu email antes de ingresar.";
    if (/user already registered/i.test(m)) return "Ese email ya está registrado.";
    if (/password should be at least/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/captcha/i.test(m)) {
      return "Supabase pide CAPTCHA. Opciones: (1) desactivar en Supabase › Authentication › Bot Protection, o (2) poner turnstileSiteKey en config.js y completar la casilla de seguridad.";
    }
    return m;
  },

  opcionesAuth(captchaToken) {
    const redirect = this.urlRedirect();
    const opts = {};
    if (redirect) opts.emailRedirectTo = redirect;
    if (captchaToken) opts.captchaToken = captchaToken;
    return opts;
  },

  async registrar(email, clave, mountId) {
    await this.ensureClient();
    if (!this.urlRedirect()) {
      throw new Error("Configurá auth.baseUrl en config.js y abrí el sitio con Live Server (no file://).");
    }
    let captchaToken;
    if (PS.captcha.necesitaToken() && mountId) {
      captchaToken = PS.captcha.tokenDe(mountId);
    }
    const { error } = await PS.store.cliente().auth.signUp({
      email,
      password: clave,
      options: this.opcionesAuth(captchaToken),
    });
    if (error) throw new Error(this.mensajeError(error));
  },

  async entrar(email, clave, mountId) {
    await this.ensureClient();
    let captchaToken;
    if (PS.captcha.necesitaToken() && mountId) {
      captchaToken = PS.captcha.tokenDe(mountId);
    }
    const { error } = await PS.store.cliente().auth.signInWithPassword({
      email,
      password: clave,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) throw new Error(this.mensajeError(error));
    await this.actualizarNav();
  },

  async salir() {
    if (PS.store.cliente()) await PS.store.cliente().auth.signOut();
    await this.actualizarNav();
  },

  async entrarConGoogle() {
    await this.ensureClient();
    const redirect = this.urlRedirect();
    if (!redirect) {
      throw new Error("Google OAuth requiere Live Server y auth.baseUrl en config.js.");
    }
    const { error } = await PS.store.cliente().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
    if (error) throw new Error(this.mensajeError(error));
  },

  async manejarRetornoOAuth() {
    await this.ensureClient().catch(() => null);
    if (!PS.store.cliente()) return;
    const { data } = await PS.store.cliente().auth.getSession();
    if (data?.session && window.location.search) {
      const ret = new URLSearchParams(window.location.search).get("return");
      window.history.replaceState({}, document.title, ret || "cuenta.html");
      if (ret) window.location.href = ret;
    }
  },

  esc(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  formatoFecha(iso) {
    try {
      return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  },

  etiquetaEstado(estado) {
    const map = { pendiente: "Pendiente", confirmado: "Confirmado", cancelado: "Cancelado" };
    return map[estado] || estado;
  },

  etiquetaEntrega(entrega) {
    return entrega === "envio" ? "Envío a domicilio" : "Retiro en local";
  },

  renderPedido(pedido) {
    const items = pedido.pedido_items || [];
    const lineas = items
      .map(
        (i) =>
          `<li>${i.cantidad}× ${PS.auth.esc(i.nombre_snapshot)} — $${(i.precio_snapshot * i.cantidad).toLocaleString("es-AR")}</li>`
      )
      .join("");
    const idCorto = PS.auth.esc(String(pedido.id).slice(0, 8));
    return `
      <article class="pedido-card">
        <header class="pedido-card__head">
          <div>
            <strong>Pedido #${idCorto}</strong>
            <span class="pedido-card__fecha">${PS.auth.esc(PS.auth.formatoFecha(pedido.created_at))}</span>
          </div>
          <span class="pedido-estado pedido-estado--${PS.auth.esc(pedido.estado)}">${PS.auth.esc(PS.auth.etiquetaEstado(pedido.estado))}</span>
        </header>
        <p class="pedido-card__meta">${PS.auth.esc(PS.auth.etiquetaEntrega(pedido.entrega))}</p>
        <ul class="pedido-card__items">${lineas || "<li>Sin ítems</li>"}</ul>
        <p class="pedido-card__total">Total: <strong>$${Number(pedido.total).toLocaleString("es-AR")}</strong></p>
      </article>`;
  },

  async cargarMisPedidos() {
    const lista = document.getElementById("pedidos-lista");
    const vacio = document.getElementById("pedidos-vacio");
    const cargando = document.getElementById("pedidos-cargando");
    const errEl = document.getElementById("pedidos-error");
    if (!lista) return;

    if (cargando) cargando.hidden = false;
    if (vacio) vacio.hidden = true;
    if (errEl) errEl.hidden = true;
    lista.innerHTML = "";

    try {
      const pedidos = await PS.store.listarMisPedidos();
      if (cargando) cargando.hidden = true;
      if (!pedidos.length) {
        if (vacio) vacio.hidden = false;
        return;
      }
      lista.innerHTML = pedidos.map((p) => PS.auth.renderPedido(p)).join("");
    } catch (err) {
      if (cargando) cargando.hidden = true;
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message || "No se pudieron cargar los pedidos.";
      }
    }
  },

  activarTabDesdeUrl() {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (!tab) return;
    const btn = document.querySelector(`[data-tab-auth="${tab}"]`);
    btn?.click();
  },

  initPaginaCuenta() {
    if (document.body.dataset.pagina !== "cuenta") return;

    PS.auth.mostrarAvisoEntorno();

    const panelSesion = document.getElementById("cuenta-sesion");
    const panelForms = document.getElementById("cuenta-forms");
    const emailSpan = document.getElementById("cuenta-email");
    const aviso = document.getElementById("cuenta-aviso");
    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro");
    const btnGoogle = document.getElementById("btn-google");
    const btnSalir = document.getElementById("btn-salir");
    const tabs = document.querySelectorAll("[data-tab-auth]");

    const mostrarAviso = (txt, ok) => {
      if (!aviso) return;
      aviso.hidden = false;
      aviso.textContent = txt;
      aviso.className = ok ? "cuenta-aviso cuenta-aviso--ok" : "cuenta-aviso cuenta-aviso--error";
    };

    const pintarSesion = async () => {
      const sesion = await PS.store.sesion();
      const logueado = !!sesion;
      if (panelSesion) panelSesion.hidden = !logueado;
      if (panelForms) panelForms.hidden = logueado;
      if (emailSpan && sesion) emailSpan.textContent = sesion.email;
      if (logueado) await PS.auth.cargarMisPedidos();
      else {
        document.getElementById("pedidos-lista")?.replaceChildren();
        ["pedidos-vacio", "pedidos-cargando", "pedidos-error"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.hidden = true;
        });
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");
        const destino = tab.dataset.tabAuth;
        document.getElementById("panel-login").hidden = destino !== "login";
        document.getElementById("panel-registro").hidden = destino !== "registro";
      });
    });

    formLogin?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formLogin);
      try {
        await PS.auth.entrar(fd.get("email"), fd.get("clave"), "turnstile-login");
        mostrarAviso("Sesión iniciada.", true);
        await pintarSesion();
        const ret = new URLSearchParams(window.location.search).get("return");
        if (ret) window.location.href = ret;
      } catch (err) {
        mostrarAviso(PS.auth.mensajeError(err), false);
      }
    });

    formRegistro?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formRegistro);
      try {
        await PS.auth.registrar(fd.get("email"), fd.get("clave"), "turnstile-registro");
        mostrarAviso("Cuenta creada. Revisá tu email si Supabase pide confirmación.", true);
      } catch (err) {
        mostrarAviso(PS.auth.mensajeError(err), false);
      }
    });

    btnGoogle?.addEventListener("click", async () => {
      try {
        await PS.auth.entrarConGoogle();
      } catch (err) {
        mostrarAviso(PS.auth.mensajeError(err), false);
      }
    });

    btnSalir?.addEventListener("click", async () => {
      await PS.auth.salir();
      mostrarAviso("Sesión cerrada.", true);
      await pintarSesion();
    });

    PS.store.estado().then(() => PS.auth.manejarRetornoOAuth()).then(pintarSesion).then(() => PS.auth.activarTabDesdeUrl());
  },

  init() {
    PS.auth.mostrarAvisoEntorno();
    PS.store.estado().then(() => this.actualizarNav());
    this.initPaginaCuenta();
  },
};

document.addEventListener("DOMContentLoaded", () => PS.auth.init());
