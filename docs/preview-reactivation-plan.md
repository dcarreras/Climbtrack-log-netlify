# Climbtrack Preview Reactivation Plan

## Estado actual

- Rama activa: `preview`
- Proyecto Supabase reutilizado: `mjgopyhssbletavwlzzs`
- Fecha de comprobacion: `2026-03-22`
- Resultado: el proyecto responde en `rest`, `auth` y `functions`, asi que no hace falta clonarlo ahora

## Estrategia recomendada con plan gratuito

- Mantener un unico proyecto cloud de Supabase para la app personal
- Evitar clonar otro proyecto cloud salvo que este quede irrecuperable
- Usar `preview` como rama de trabajo y deploy estable de Netlify para no tocar `main`
- Si necesitas un segundo entorno, hacerlo en local con Supabase CLI y Docker, no con otro proyecto cloud

## MVP funcional

- Dashboard conjunto de escalada y carrera
- Registro manual de sesiones
- Registro de bloques y vias
- Fotos ligadas a sesiones y escaladas
- Sincronizacion Strava para carrera
- Ajustes personales y objetivo semanal de running

## Fuera del MVP

- Planning
- Timers avanzados
- Protocolos persistentes de hangboard
- Resumen con OpenAI
- Biblioteca independiente
- Landing de marketing

## Variables necesarias

### Netlify preview

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Supabase Edge Functions

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `SITE_URL`
- `APP_ALLOWED_ORIGINS`

## Valores recomendados para preview

- `SITE_URL`: URL estable de la rama `preview` en Netlify
- `APP_ALLOWED_ORIGINS`: lista separada por comas con:
  - la URL estable de `preview`
  - la URL principal si quieres mantenerla operativa
  - `http://localhost:8080`
  - `http://localhost:4173`
  - `http://127.0.0.1:8080`
  - `http://127.0.0.1:4173`

## Orden de trabajo

1. Confirmar variables y CORS de Strava
2. Probar login y sync desde `preview`
3. Validar el flujo de nueva sesion
4. Revisar fotos y detalle de sesiones
5. Cuando `preview` quede estable, decidir si algo vuelve a `main`
