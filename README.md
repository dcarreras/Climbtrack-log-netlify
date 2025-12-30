# Ascend Track Log

## Requisitos

- Node.js 18+ (o 20+)
- npm

## Configuracion

1. Copia `.env.example` a `.env`.
2. Completa las variables del cliente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID` (opcional)
3. En Supabase (Edge Functions) define:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (opcional, por defecto `gpt-4o-mini`)
   - `SITE_URL` con la URL de Netlify para CORS

## Desarrollo local

```sh
npm install
npm run dev
```

## Netlify

La configuracion recomendada para un primer deploy:

- Build command: `npm run build`
- Publish directory: `dist`
- Variables de entorno en Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (si aplica)

El archivo `netlify.toml` ya incluye el redirect SPA a `index.html`.
