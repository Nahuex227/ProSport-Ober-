/* ProSport Oberá — configuración (mismo patrón que LEGACYZ/config.js)
   Paso siguiente: tablas de ecommerce en Supabase (productos, pedidos).
   La base LEGACYZ actual es del proyecto calculadora; no comparte esas tablas. */

window.PS = window.PS || {};

PS.config = {
  marca: "ProSport Oberá",
  claveCarrito: "prosport.carrito.v1",

  supabase: {
    url: "https://hrrqpmcscvzeaowbinrt.supabase.co",
    clavePublica: "sb_publishable_CxDkgoeurqMztdRIGs_4nQ_73WmDfzS",
  },

  tablas: {
    productos: "productos",
    pedidos: "pedidos",
    pedidoItems: "pedido_items",
    admins: "admins",
  },

  bucketProductos: "productos",

  tiempos: {
    sdk: 2500,
    red: 5000,
  },

  claveEspejo: "prosport.espejo.v1",

  /* auto | supabase | local */
  backend: "auto",

  auth: {
    /* Vacío = detecta la URL actual (GitHub Pages o Live Server). Solo file:// necesita baseUrl manual. */
    baseUrl: "",
    redirectPath: "cuenta.html",
    /* Site key del widget Turnstile de Nahuel */
    turnstileSiteKey: "0x4AAAAAAFZU2H3NsfWs1SCg",
  },
};
