import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { getCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Eres un asistente de coaching para ClimbTracker. Tu único trabajo es transformar el plan de entrenamiento proporcionado en una ficha de resumen breve y accionable.

REGLAS CRÍTICAS:
- NO inventes ejercicios ni estructuras que no estén en el plan.
- Solo reorganiza y resume lo que ya está planificado.
- Si falta información, usa "(según planificación)" y mantén genérico.
- Frases cortas, bullets, sin explicaciones largas.
- Nunca menciones "como IA" ni "no puedo".
- Máximo 150 palabras.

FORMATO DE SALIDA (exactamente estos 4 bloques):

🎯 Intención
[1 línea derivada del tipo/objetivo]

🧩 Estructura
• [bullet 1]
• [bullet 2]
• [bullet 3]
(máximo 5 bullets)

⚙️ Claves
• [clave 1]
• [clave 2]
• [clave 3]

🛑 Límites
• [límite 1]
• [límite 2]

CLAVES SEGÚN TIPO:
- Boulder: pies silenciosos, cadera primero, máx 3 intentos por bloque duro, gestión de descansos
- Rope/Autobelay: ritmo, chapaje/fluidez, descansos, exposición mental
- Running: ritmo objetivo, respiración nasal, técnica simple (paso corto, hombros sueltos)

PARSING DEL PLAN:
- Detecta patrones: "2x4", "4x4", "3 series", "RPE 6/10", "descanso 2'"
- Mantén números y estructuras tal cual aparecen
- Si hay bullets o listas, reorganízalas en los bloques`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // VALIDATE AUTHENTICATION
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { sessionType, trainerNotes, notes, distanceKm, timeMin } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    // Build context from session data
    let userPrompt = `Genera el resumen de hoy para esta sesión planificada:\n\n`;
    userPrompt += `TIPO: ${sessionType}\n`;
    
    if (distanceKm) {
      userPrompt += `DISTANCIA PLANIFICADA: ${distanceKm} km\n`;
    }
    if (timeMin) {
      userPrompt += `DURACIÓN PLANIFICADA: ${timeMin} min\n`;
    }
    
    if (trainerNotes) {
      userPrompt += `\nPLAN DE LA ENTRENADORA:\n${trainerNotes}\n`;
    }
    
    if (notes) {
      userPrompt += `\nNOTAS ADICIONALES:\n${notes}\n`;
    }

    if (!trainerNotes && !notes) {
      userPrompt += `\n(No hay plan detallado disponible. Genera un resumen genérico basado en el tipo de sesión.)`;
    }

    console.log("Generating summary for:", { sessionType, hasTrainerNotes: !!trainerNotes, hasNotes: !!notes });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("OpenAI API error:", status, text);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de peticiones excedido. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 401) {
        return new Response(JSON.stringify({ error: "Credenciales de IA invalidas. Revisa OPENAI_API_KEY." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Error al generar el resumen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    console.log("Summary generated successfully");

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("session-summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
