/* Cloudflare Turnstile — requerido si Supabase tiene CAPTCHA activo */
window.PS = window.PS || {};

PS.captcha = {
  _listo: false,
  _tokens: {},

  siteKey() {
    return (PS.config.auth && PS.config.auth.turnstileSiteKey) || "";
  },

  necesitaToken() {
    return !!this.siteKey();
  },

  cargarScript() {
    if (!this.necesitaToken() || document.querySelector('script[src*="turnstile"]')) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar Turnstile."));
      document.head.appendChild(s);
    });
  },

  reset(mountId) {
    delete this._tokens[mountId];
    const el = document.getElementById(mountId);
    if (el && window.turnstile && el.dataset.turnstileId) {
      window.turnstile.reset(el.dataset.turnstileId);
    }
  },

  montar(elemento) {
    const mount = typeof elemento === "string" ? document.getElementById(elemento) : elemento;
    if (!mount || mount.dataset.turnstileRendered === "1") return Promise.resolve();

    const key = this.siteKey();
    if (!key) return Promise.resolve();

    return this.cargarScript().then(() => {
      if (!window.turnstile) return;
      const id = mount.id || `turnstile-${Math.random().toString(36).slice(2)}`;
      mount.id = id;
      mount.dataset.turnstileRendered = "1";
      const widgetId = window.turnstile.render(`#${id}`, {
        sitekey: key,
        callback: (token) => {
          this._tokens[id] = token;
        },
        "expired-callback": () => {
          delete this._tokens[id];
        },
        "error-callback": () => {
          delete this._tokens[id];
        },
      });
      mount.dataset.turnstileId = widgetId;
    });
  },

  tokenDe(mountId) {
    const t = this._tokens[mountId];
    if (t) return t;
    throw new Error(
      "Completá la verificación antes de continuar."
    );
  },

  initEnPagina() {
    document.querySelectorAll("[data-turnstile-mount]").forEach((el) => {
      void this.montar(el);
    });
  },
};

document.addEventListener("DOMContentLoaded", () => PS.captcha.initEnPagina());
