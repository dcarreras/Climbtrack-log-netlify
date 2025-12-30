import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Target, 
  Puzzle, 
  Settings2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  FileText
} from 'lucide-react';

interface PlannedSessionData {
  id: string;
  session_type: string;
  trainer_notes: string | null;
  notes: string | null;
  distance_km?: number | null;
  time_min?: number | null;
}

interface PlannedSessionSummaryCardProps {
  session: PlannedSessionData;
  onStart: () => void;
}

interface ParsedSummary {
  intencion: string;
  estructura: string[];
  claves: string[];
  limites: string[];
}

function parseSummary(text: string): ParsedSummary {
  const result: ParsedSummary = {
    intencion: '',
    estructura: [],
    claves: [],
    limites: [],
  };

  const sections = text.split(/🎯|🧩|⚙️|🛑/);
  
  // Find sections by content
  const lines = text.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes('🎯') || trimmed.toLowerCase().includes('intención')) {
      currentSection = 'intencion';
      const content = trimmed.replace(/🎯\s*intención:?/i, '').replace(/🎯/g, '').trim();
      if (content) result.intencion = content;
    } else if (trimmed.includes('🧩') || trimmed.toLowerCase().includes('estructura')) {
      currentSection = 'estructura';
    } else if (trimmed.includes('⚙️') || trimmed.toLowerCase().includes('claves')) {
      currentSection = 'claves';
    } else if (trimmed.includes('🛑') || trimmed.toLowerCase().includes('límites')) {
      currentSection = 'limites';
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const content = trimmed.replace(/^[•\-\*]\s*/, '').trim();
      if (content && currentSection === 'estructura') {
        result.estructura.push(content);
      } else if (content && currentSection === 'claves') {
        result.claves.push(content);
      } else if (content && currentSection === 'limites') {
        result.limites.push(content);
      }
    } else if (trimmed && currentSection === 'intencion' && !result.intencion) {
      result.intencion = trimmed;
    }
  }

  return result;
}

export default function PlannedSessionSummaryCard({ session, onStart }: PlannedSessionSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullPlan, setShowFullPlan] = useState(false);

  useEffect(() => {
    generateSummary();
  }, [session.id]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('session-summary', {
        body: {
          sessionType: session.session_type,
          trainerNotes: session.trainer_notes,
          notes: session.notes,
          distanceKm: session.distance_km,
          timeMin: session.time_min,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSummary(data.summary);
    } catch (err) {
      console.error('Error generating summary:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al generar resumen';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const parsed = summary ? parseSummary(summary) : null;
  const fullPlanText = session.trainer_notes || session.notes || '';

  if (isLoading) {
    return (
      <Card className="card-elevated border-primary/30 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Generando resumen...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-elevated border-destructive/30 mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">No se pudo generar el resumen</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{error}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateSummary}>
              Reintentar
            </Button>
            <Button size="sm" onClick={onStart}>
              Continuar sin resumen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated border-primary/30 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumen de hoy
          </CardTitle>
          <Badge variant="secondary" className="text-xs capitalize">
            {session.session_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsed && (
          <>
            {/* Intención */}
            {parsed.intencion && (
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">Intención</span>
                  <p className="text-sm font-medium">{parsed.intencion}</p>
                </div>
              </div>
            )}

            {/* Estructura */}
            {parsed.estructura.length > 0 && (
              <div className="flex items-start gap-2">
                <Puzzle className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Estructura</span>
                  <ul className="text-sm space-y-1 mt-1">
                    {parsed.estructura.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Claves */}
            {parsed.claves.length > 0 && (
              <div className="flex items-start gap-2">
                <Settings2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Claves</span>
                  <ul className="text-sm space-y-1 mt-1">
                    {parsed.claves.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Límites */}
            {parsed.limites.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Límites</span>
                  <ul className="text-sm space-y-1 mt-1">
                    {parsed.limites.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-orange-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* Full plan collapsible */}
        {fullPlanText && (
          <Collapsible open={showFullPlan} onOpenChange={setShowFullPlan}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2">
              <FileText className="h-3 w-3" />
              {showFullPlan ? 'Ocultar plan completo' : 'Ver plan completo'}
              {showFullPlan ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                {fullPlanText}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={onStart} className="flex-1" size="lg">
            <Play className="h-4 w-4 mr-2" />
            Empezar sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
