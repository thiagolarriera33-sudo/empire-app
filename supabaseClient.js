import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "⚠️ Faltan las variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
    "Copia .env.example a .env y rellena tus claves de Supabase."
  );
}

export const supabase = createClient(url, key);
