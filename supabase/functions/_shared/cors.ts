const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:4173",
];

function parseOriginList(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(): string[] {
  const origins = new Set<string>(DEFAULT_ALLOWED_ORIGINS);

  [
    Deno.env.get("SITE_URL"),
    Deno.env.get("APP_URL"),
    ...parseOriginList(Deno.env.get("APP_ALLOWED_ORIGINS")),
  ]
    .filter(Boolean)
    .forEach((origin) => origins.add(origin!));

  return Array.from(origins);
}

export function isAllowedOrigin(
  origin: string | null,
  allowedOrigins = getAllowedOrigins(),
): boolean {
  if (!origin) return false;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    return (
      (protocol === "http:" || protocol === "https:") &&
      hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

export function getCorsHeaders(
  origin: string | null,
  allowedOrigins = getAllowedOrigins(),
): Record<string, string> {
  const fallbackOrigin = allowedOrigins[0] ?? "http://localhost:8080";

  return {
    "Access-Control-Allow-Origin":
      isAllowedOrigin(origin, allowedOrigins) && origin ? origin : fallbackOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}
