-- ProSport Oberá — Ecommerce (proyecto hrrqpmcscvzeaowbinrt)
-- Migración: prosport_ecommerce_core (ya aplicada en Supabase vía MCP)

create table if not exists public.productos (
  id            text primary key,
  nombre        text not null,
  precio        integer not null check (precio >= 0),
  categoria     text,
  imagen_url    text,
  descripcion   text,
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nombre      text not null,
  email       text not null,
  telefono    text not null,
  entrega     text not null check (entrega in ('retiro', 'envio')),
  direccion   text,
  notas       text,
  total       integer not null check (total >= 0),
  estado      text not null default 'pendiente'
);

create table if not exists public.pedido_items (
  id               bigserial primary key,
  pedido_id        uuid not null references public.pedidos(id) on delete cascade,
  producto_id      text references public.productos(id) on delete set null,
  nombre_snapshot  text not null,
  precio_snapshot  integer not null check (precio_snapshot >= 0),
  cantidad         integer not null check (cantidad > 0 and cantidad <= 99)
);

-- RLS: lectura pública de productos activos; insert de pedidos/items para visitantes (anon).
-- Detalle completo en la migración remota prosport_ecommerce_core.
