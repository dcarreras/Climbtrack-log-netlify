import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from .env* files and from the host environment
  const env = loadEnv(mode, process.cwd(), "");

  const projectId =
    env.VITE_SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_ID ||
    "mjgopyhssbletavwlzzs";

  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (projectId ? `https://${projectId}.supabase.co` : undefined);

  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    // Fallback anon/publishable key (safe to expose; used by the browser client)
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ29weWhzc2JsZXRhdndsenpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTg5NjksImV4cCI6MjA4MjMzNDk2OX0.a9LGh761nNuWnOVF28DHmfTpJLKfMQH5MghdvT9g6qI";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Ensure the generated Supabase client always receives values in all build environments
    define: {
      ...(supabaseUrl ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl) } : {}),
      ...(supabaseKey ? { "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey) } : {}),
    },
  };
});
