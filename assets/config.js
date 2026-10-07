// Vault & Vine — Supabase connection
// The publishable key is designed to be public: it only lets the browser talk to
// Supabase. What each signed-in user can read or write is enforced in the database
// by Row Level Security (see supabase/migrations). Never put a *secret* key here.
window.VV_CONFIG = {
  SUPABASE_URL: "https://rwxernfvmhfosymlblek.supabase.co",
  SUPABASE_KEY: "sb_publishable_rmvISkoj1p2wsrrREWeoNg_4jS2Leep"
};
