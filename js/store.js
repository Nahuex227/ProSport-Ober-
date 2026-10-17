/* ProSport — capa de datos (patrón LEGACYZ, simplificado) */
window.PS = window.PS || {};

(function () {
  "use strict";

  const cfg = PS.config;
  let cliente = null;
  let cayoPorFalla = false;
  let usandoRespaldo = false;
  let ultimoMotivo = "";

  function copiar(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function conLimite(promesa, ms, etiqueta) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(etiqueta + " tardó demasiado.")), ms);
      promesa.then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  const Espejo = {
    leerProductos() {
      try {
        const raw = localStorage.getItem(cfg.claveEspejo);
        if (!raw) return null;
        const base = JSON.parse(raw);
        return base.productos || null;
      } catch {
        return null;
      }
    },
    guardarProductos(lista) {
      try {
        localStorage.setItem(cfg.claveEspejo, JSON.stringify({ productos: lista }));
      } catch {
        /* ignore */
      }
    },
  };

  function respaldoProductos() {
    const delEspejo = Espejo.leerProductos();
    if (delEspejo?.length) return copiar(delEspejo);
    return copiar(PS.datosIniciales.productos);
  }

  function haySDK() {
    return !!(window.supabase && window.supabase.createClient);
  }

  function esperarSDK() {
    if (haySDK()) return Promise.resolve(true);
    return new Promise((resolve) => {
      let listo = false;
      const fin = (v) => {
        if (listo) return;
        listo = true;
        resolve(v);
      };
      const tag = document.querySelector('script[src*="supabase-js"]');
      if (tag) {
        tag.addEventListener("load", () => fin(haySDK()));
        tag.addEventListener("error", () => fin(false));
      }
      setTimeout(() => fin(haySDK()), cfg.tiempos.sdk);
    });
  }

  function iniciar() {
    if (cliente) return Promise.resolve(true);
    if (!cfg.supabase.url || !cfg.supabase.clavePublica) {
      ultimoMotivo = "Faltan url o clave en config.js";
      return Promise.resolve(false);
    }
    return esperarSDK().then((ok) => {
      if (!ok) {
        ultimoMotivo = "No se cargó el SDK de Supabase.";
        return false;
      }
      cliente = window.supabase.createClient(cfg.supabase.url, cfg.supabase.clavePublica, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      });
      return true;
    });
  }

  function exigirConexion() {
    if (cfg.backend === "local") {
      throw new Error("Modo local: activá backend 'auto' en config.js para guardar pedidos.");
    }
  }

  PS.store = {
    ensure: iniciar,

    cliente() {
      return cliente;
    },

    estado() {
      return iniciar().then((ok) => ({
        conectado: ok && !usandoRespaldo,
        respaldo: usandoRespaldo,
        motivo: ultimoMotivo,
      }));
    },

    listarProductos() {
      if (cfg.backend === "local") {
        return Promise.resolve(copiar(PS.datosIniciales.productos));
      }

      return iniciar().then((ok) => {
        if (!ok) {
          if (cfg.backend === "supabase") throw new Error(ultimoMotivo);
          cayoPorFalla = true;
          usandoRespaldo = true;
          return respaldoProductos();
        }

        return conLimite(
          cliente
            .from(cfg.tablas.productos)
            .select("*")
            .eq("activo", true)
            .order("orden", { ascending: true }),
          cfg.tiempos.red,
          "Catálogo"
        )
          .then((r) => {
            if (r.error) throw r.error;
            const lista = r.data || [];
            Espejo.guardarProductos(lista);
            usandoRespaldo = false;
            return lista;
          })
          .catch((err) => {
            if (cfg.backend === "supabase") throw err;
            usandoRespaldo = true;
            ultimoMotivo = err.message || "Error de red";
            return respaldoProductos();
          });
      });
    },

    sesion() {
      return iniciar().then((ok) => {
        if (!ok || !cliente) return null;
        return cliente.auth.getSession().then(({ data }) => {
          const s = data?.session;
          return s ? { id: s.user.id, email: s.user.email } : null;
        });
      });
    },

    listarMisPedidos() {
      return iniciar().then((ok) => {
        if (!ok) throw new Error(ultimoMotivo || "Sin conexión");

        return PS.store.sesion().then((usuario) => {
          if (!usuario) throw new Error("Iniciá sesión para ver tus pedidos.");

          const emailQ = `"${String(usuario.email).replace(/"/g, "")}"`;
          const filtro = `usuario_id.eq.${usuario.id},and(usuario_id.is.null,email.eq.${emailQ})`;

          return conLimite(
            cliente
              .from(cfg.tablas.pedidos)
              .select(`id, created_at, total, estado, entrega, nombre, email, pedido_items ( id, nombre_snapshot, precio_snapshot, cantidad, producto_id )`)
              .or(filtro)
              .order("created_at", { ascending: false }),
            cfg.tiempos.red,
            "Pedidos"
          ).then((r) => {
            if (r.error) throw r.error;
            return r.data || [];
          });
        });
      });
    },

    crearPedido(clienteDatos, items, total) {
      exigirConexion();
      return iniciar().then((ok) => {
        if (!ok) throw new Error(ultimoMotivo);

        return PS.store.sesion().then((usuario) => {
          const filaPedido = {
            nombre: String(clienteDatos.nombre).trim(),
            email: String(clienteDatos.email).trim(),
            telefono: String(clienteDatos.telefono).trim(),
            entrega: clienteDatos.entrega,
            direccion: clienteDatos.direccion ? String(clienteDatos.direccion).trim() : null,
            notas: clienteDatos.notas ? String(clienteDatos.notas).trim() : null,
            total,
            usuario_id: usuario?.id || null,
          };

          return cliente
            .from(cfg.tablas.pedidos)
            .insert(filaPedido)
            .select("id, created_at")
            .single()
            .then((res) => {
              if (res.error) throw res.error;
              const pedidoId = res.data.id;
              const lineas = items.map((i) => ({
                pedido_id: pedidoId,
                producto_id: i.id,
                nombre_snapshot: i.nombre,
                precio_snapshot: i.precio,
                cantidad: i.cantidad,
              }));

              return cliente.from(cfg.tablas.pedidoItems).insert(lineas).then((resItems) => {
                if (resItems.error) throw resItems.error;
                return { id: pedidoId, created_at: res.data.created_at };
              });
            });
        });
      });
    },
  };
})();
