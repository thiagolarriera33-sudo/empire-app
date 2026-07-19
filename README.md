# EMPIRE — Guía de puesta en marcha (15-20 minutos)

Esta app ya tiene: login/registro real, base de datos real, y los 6 módulos
(Dashboard, Hábitos, Trading, Finanzas, Entrenamiento, Dropshipping)
conectados a esa base de datos — nada de datos inventados.

Solo faltan 2 cosas que **tienes que hacer tú** porque requieren tu cuenta:
crear el proyecto de base de datos (Supabase) y desplegar la web (Vercel).
Ambas son gratuitas y no piden tarjeta.

---

## PASO 1 — Crear la base de datos (Supabase)

1. Ve a **https://supabase.com** → "Start your project" → regístrate con tu email o Google.
2. Clic en **"New project"**.
   - Nombre: `empire`
   - Contraseña de base de datos: la que quieras (guárdala)
   - Región: la más cercana a ti (Europe West, por ejemplo)
3. Espera ~2 minutos a que se cree el proyecto.
4. En el menú lateral, ve a **SQL Editor → New query**.
5. Abre el archivo `schema.sql` de esta carpeta, copia **todo** el contenido, pégalo ahí, y pulsa **Run**.
   - Esto crea todas las tablas (hábitos, trading, finanzas, entrenamiento, dropshipping) con seguridad por usuario ya activada.
6. Ve a **Project Settings → API**. Ahí verás:
   - **Project URL** → esto es tu `VITE_SUPABASE_URL`
   - **anon public key** → esto es tu `VITE_SUPABASE_ANON_KEY`

---

## PASO 2 — Conectar la app a tu base de datos

1. Dentro de esta carpeta, copia el archivo `.env.example` y renómbralo a `.env`
2. Pega tus dos claves del paso anterior:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## PASO 3 — Probarlo en tu ordenador

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o superior). Luego:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` — regístrate con tu email dentro de la app y ya
puedes empezar a añadir hábitos, operaciones, gastos, etc. Se guardan de verdad.

> Nota: por defecto Supabase pide confirmar el email al registrarte. Si quieres
> desactivar esa confirmación mientras pruebas, ve a **Authentication → Providers → Email**
> y desactiva "Confirm email".

---

## PASO 4 — Publicarla en internet (Vercel, gratis)

1. Ve a **https://vercel.com** → regístrate (con GitHub es lo más rápido).
2. Sube esta carpeta a un repositorio de GitHub (o usa `vercel` desde la terminal
   con `npx vercel` si no quieres usar GitHub).
3. En Vercel: **Add New → Project** → importa tu repositorio.
4. En "Environment Variables" añade las mismas dos claves del `.env`.
5. Deploy. En ~1 minuto tienes tu URL pública, por ejemplo `empire-tuyo.vercel.app`.

---

## PASO 5 — Cuando quieras subirla a App Store / Play Store

Este proyecto ya está preparado para ese paso (es una web app instalable).
Cuando estés listo, dime y te ayudo a:
- Empaquetarla con **Capacitor** para generar los proyectos nativos de iOS y Android
- Preparar iconos, splash screen y metadatos
- Guiarte en la subida a Google Play Console y App Store Connect

Eso sí necesitará que tengas creadas tus cuentas de desarrollador
(Google Play: 25$ pago único / Apple: 99$ al año), porque requieren tu identidad.

---

## Estructura del proyecto

```
empire-app/
├── schema.sql          ← ejecutar una vez en Supabase
├── .env.example         ← plantilla de claves (copiar a .env)
├── src/
│   ├── supabaseClient.js   ← conexión a la base de datos
│   ├── lib/api.js          ← todas las funciones de lectura/escritura (el "API")
│   └── App.jsx              ← interfaz completa (login + 6 módulos)
```
