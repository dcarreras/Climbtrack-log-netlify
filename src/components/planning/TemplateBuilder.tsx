import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type BlockType = 'warmup' | 'main' | 'cooldown';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  label: string;
  sets: number | null;
  grade: string;
  optional: boolean;
}

interface Props {
  blocks: TemplateBlock[];
  onChange: (blocks: TemplateBlock[]) => void;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  warmup: 'Calentamiento',
  main: 'Bloque principal',
  cooldown: 'Vuelta a la calma',
};

const BLOCK_COLORS: Record<BlockType, string> = {
  warmup: 'rgba(250,250,249,0.03)',
  main: 'rgba(226,58,31,0.08)',
  cooldown: 'rgba(250,250,249,0.03)',
};

const BLOCK_BORDER: Record<BlockType, string> = {
  warmup: 'rgba(250,250,249,0.16)',
  main: 'rgba(226,58,31,0.28)',
  cooldown: 'rgba(250,250,249,0.16)',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function newBlock(type: BlockType): TemplateBlock {
  return {
    id: uid(),
    type,
    label: '',
    sets: type === 'main' ? 3 : null,
    grade: '',
    optional: type === 'cooldown',
  };
}

export default function TemplateBuilder({ blocks, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const add = (type: BlockType) => {
    onChange([...blocks, newBlock(type)]);
  };

  const remove = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const update = (id: string, patch: Partial<TemplateBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...blocks];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        const isCollapsed = collapsed.has(block.id);
        return (
          <div
            key={block.id}
            style={{
              background: BLOCK_COLORS[block.type],
              border: `1px solid ${BLOCK_BORDER[block.type]}`,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2"
              onClick={() => toggleCollapse(block.id)}
            >
              <GripVertical
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: 'rgba(250,250,249,0.3)' }}
              />
              <span
                style={{
                  fontFamily: "'Urbanist', sans-serif",
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: 'rgba(250,250,249,0.5)',
                  flexShrink: 0,
                }}
              >
                {BLOCK_LABELS[block.type]}
              </span>
              {block.label && (
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    fontFamily: "'Urbanist', sans-serif",
                    fontSize: 12,
                    color: 'rgba(250,250,249,0.85)',
                  }}
                >
                  — {block.label}
                </span>
              )}
              {block.sets && (
                <span
                  className="text-[11px] sm:ml-0"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'rgba(250,250,249,0.6)',
                    flexShrink: 0,
                  }}
                >
                  {block.sets}× {block.grade}
                </span>
              )}
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    move(i, -1);
                  }}
                  disabled={i === 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: i === 0 ? 'default' : 'pointer',
                    color: i === 0 ? 'rgba(250,250,249,0.2)' : 'rgba(250,250,249,0.5)',
                    padding: '4px',
                  }}
                >
                  <ChevronUp style={{ width: 12, height: 12 }} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    move(i, 1);
                  }}
                  disabled={i === blocks.length - 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: i === blocks.length - 1 ? 'default' : 'pointer',
                    color:
                      i === blocks.length - 1
                        ? 'rgba(250,250,249,0.2)'
                        : 'rgba(250,250,249,0.5)',
                    padding: '4px',
                  }}
                >
                  <ChevronDown style={{ width: 12, height: 12 }} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(block.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(226,58,31,0.7)',
                    padding: '4px',
                  }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col gap-3 px-3 pb-3">
                <div>
                  <Label style={{ fontSize: 10, color: 'rgba(250,250,249,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Descripción
                  </Label>
                  <Input
                    value={block.label}
                    onChange={e => update(block.id, { label: e.target.value })}
                    placeholder={block.type === 'warmup' ? 'Ej: Calentamiento general' : block.type === 'main' ? 'Ej: Bloque entreno' : 'Ej: Vuelta a la calma'}
                    style={{ marginTop: 4, background: 'rgba(250,250,249,0.03)', border: '1px solid rgba(250,250,249,0.12)', color: '#FAFAF9', fontSize: 13 }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[80px_minmax(0,1fr)]">
                  <div>
                    <Label style={{ fontSize: 10, color: 'rgba(250,250,249,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      Series
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={block.sets ?? ''}
                      onChange={e => update(block.id, { sets: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="—"
                      style={{ marginTop: 4, background: 'rgba(250,250,249,0.03)', border: '1px solid rgba(250,250,249,0.12)', color: '#FAFAF9', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 10, color: 'rgba(250,250,249,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      Grado / detalle
                    </Label>
                    <Input
                      value={block.grade}
                      onChange={e => update(block.id, { grade: e.target.value })}
                      placeholder="Ej: 6b/+ o dedos 5 seg"
                      style={{ marginTop: 4, background: 'rgba(250,250,249,0.03)', border: '1px solid rgba(250,250,249,0.12)', color: '#FAFAF9', fontSize: 13 }}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={block.optional}
                    onChange={e => update(block.id, { optional: e.target.checked })}
                    style={{ accentColor: '#E23A1F' }}
                  />
                  <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: 12, color: 'rgba(250,250,249,0.5)' }}>
                    Opcional
                  </span>
                </label>
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-1 grid gap-2 sm:grid-cols-3">
        {(['warmup', 'main', 'cooldown'] as BlockType[]).map(type => (
          <button
            key={type}
            onClick={() => add(type)}
            style={{
              background: BLOCK_COLORS[type],
              border: `1px dashed ${BLOCK_BORDER[type]}`,
              color: type === 'main' ? '#FAFAF9' : 'rgba(250,250,249,0.62)',
              cursor: 'pointer',
              fontFamily: "'Urbanist', sans-serif",
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '10px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Plus style={{ width: 10, height: 10 }} />
            {BLOCK_LABELS[type].split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
