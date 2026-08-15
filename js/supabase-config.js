const SUPABASE_URL = 'https://adwxhxukqgmqinpgfjcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkd3hoeHVrcWdtcWlucGdmamNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDk5ODQsImV4cCI6MjEwMDkyNTk4NH0.7DC96NptFeB0lR4m3ynl-rP4Ab9p_RPmZ2sj6UPMjdc';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Modo demo/preview: con ?demo=1 y SOLO en localhost/127.0.0.1, permite
   ver los módulos sin sesión (para probar la interfaz sin credenciales).
   En producción (otro host) siempre devuelve false y NO afecta el acceso. */
function demoPreviewMode() {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return false;
  return new URLSearchParams(location.search).get('demo') === '1';
}
