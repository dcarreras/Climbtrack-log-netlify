import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, ChevronRight, BookTemplate, Save } from 'lucide-react';
import { toast } from 'sonner';
import TemplateBuilder, { TemplateBlock } from './TemplateBuilder';
import type { Database } from '@/integrations/supabase/types';

type SessionType = Database['public']['Enums']['session_type'];

interface Template {
  id: string;
  name: string;
  session_type: SessionType;
  blocks: TemplateBlock[];
}

interface Props {
  sessionType: SessionType;
  onSelect: (blocks: TemplateBlock[]) => void;
}

const T = {
  bg: '#050505', ink: '#FAFAF9', inkFaint: 'rgba(250,250,249,0.38)',
  inkMuted: 'rgba(250,250,249,0.62)', rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)', accent: '#E23A1F',
  sans: "'Urbanist', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

export default function TemplatePicker({ sessionType, onSelect }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [newName, setNewName] = useState('');
  const [newBlocks, setNewBlocks] = useState<TemplateBlock[]>([]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['session-templates', user?.id, sessionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .eq('user_id', user!.id)
        .eq('session_type', sessionType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newName.trim()) throw new Error('Nombre requerido');
      const { error } = await supabase.from('session_templates').insert({
        user_id: user.id,
        name: newName.trim(),
        session_type: sessionType,
        blocks: newBlocks as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plantilla guardada');
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
      setView('list');
      setNewName('');
      setNewBlocks([]);
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('session_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plantilla eliminada');
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
    },
  });

  if (view === 'new') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setView('list')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.inkFaint, fontFamily: T.sans, fontSize: 12,
            textDecoration: 'underline',
          }}>← Volver</button>
          <span style={{ fontFamily: T.sans, fontSize: 12, color: T.inkFaint }}>Nueva plantilla</span>
        </div>

        <div>
          <Label style={{ fontSize: 10, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Nombre de la plantilla
          </Label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ej: Escalera 3-2-3 vías"
            style={{ marginTop: 4, background: 'rgba(5,5,5,0.6)', border: `1px solid ${T.ruleStrong}`, color: T.ink }}
          />
        </div>

        <div>
          <Label style={{ fontSize: 10, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>
            Bloques de la sesión
          </Label>
          <TemplateBuilder blocks={newBlocks} onChange={setNewBlocks} />
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !newName.trim()}
          style={{
            background: T.ink, color: T.bg, border: 'none',
            padding: '12px', cursor: saveMutation.isPending || !newName.trim() ? 'not-allowed' : 'pointer',
            fontFamily: T.sans, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            opacity: saveMutation.isPending || !newName.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Save style={{ width: 14, height: 14 }} />
          Guardar plantilla
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.sans, fontSize: 10, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
          Plantillas guardadas
        </span>
        <button onClick={() => setView('new')} style={{
          background: 'none', border: `1px solid ${T.ruleStrong}`,
          color: T.inkMuted, cursor: 'pointer', padding: '4px 10px',
          fontFamily: T.sans, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          + Nueva
        </button>
      </div>

      {isLoading ? (
        <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkFaint, padding: '12px 0' }}>Cargando…</div>
      ) : templates.length === 0 ? (
        <div style={{
          padding: '20px', border: `1px solid ${T.rule}`, textAlign: 'center',
        }}>
          <BookTemplate style={{ width: 24, height: 24, color: T.inkFaint, margin: '0 auto 8px' }} />
          <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkFaint }}>
            No hay plantillas guardadas para este tipo de sesión
          </div>
          <button onClick={() => setView('new')} style={{
            marginTop: 10, background: 'none', border: 'none',
            color: T.accent, cursor: 'pointer', fontFamily: T.sans, fontSize: 12,
            textDecoration: 'underline',
          }}>Crear primera plantilla</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {templates.map(tpl => (
            <div key={tpl.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid ${T.rule}`, padding: '10px 12px',
            }}>
              <button
                onClick={() => onSelect(tpl.blocks)}
                style={{
                  flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>
                    {tpl.name}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkFaint, marginTop: 2 }}>
                    {tpl.blocks.length} bloques
                  </div>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: T.inkFaint, flexShrink: 0 }} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar plantilla "${tpl.name}"?`)) {
                    deleteMutation.mutate(tpl.id);
                  }
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,58,31,0.6)', padding: 4 }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
