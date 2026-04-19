import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import TimerStopwatch from '@/components/timer/TimerStopwatch';
import StrengthSessions from '@/components/timer/StrengthSessions';
import HangboardSession from '@/components/timer/HangboardSession';
import DensityWall from '@/components/timer/DensityWall';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Timer, Dumbbell, Hand, LayoutGrid, Volume2, VolumeX } from 'lucide-react';

const T = {
  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)',
  inkFaint: 'rgba(250,250,249,0.38)',
  rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)',
};

type TimerTab = 'timers' | 'strength' | 'hangboard' | 'density';

const VALID_TABS = new Set<TimerTab>(['timers', 'strength', 'hangboard', 'density']);

export default function TimerPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = useMemo<TimerTab>(() => {
    const requested = searchParams.get('tab') as TimerTab | null;
    return requested && VALID_TABS.has(requested) ? requested : 'timers';
  }, [searchParams]);

  const updateTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-6 sm:px-6">
        <div className="space-y-6">
          <header className="space-y-4">
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: T.inkFaint }}>
              Cronómetro
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4" style={{ borderColor: T.rule }}>
              <div>
                <h1
                  className="text-[clamp(2.3rem,8vw,4rem)] font-bold uppercase leading-none tracking-[-0.05em]"
                  style={{ color: T.ink }}
                >
                  Temporizar
                </h1>
                <p className="mt-2 text-sm" style={{ color: T.inkMuted }}>
                  Campus, hangboard, fuerza y densidad en una misma pantalla.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" style={{ color: T.inkFaint }} />
                ) : (
                  <VolumeX className="h-4 w-4" style={{ color: T.inkFaint }} />
                )}
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: T.inkMuted }}>
                  Sonido
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
              </div>
            </div>
          </header>

          <Tabs value={initialTab} onValueChange={updateTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-0 rounded-none border bg-transparent p-0 md:grid-cols-4" style={{ borderColor: T.ruleStrong }}>
              <TabsTrigger
                value="timers"
                className="rounded-none border-r border-b px-3 py-4 data-[state=active]:bg-white data-[state=active]:text-black md:border-b-0"
                style={{ borderColor: T.rule }}
              >
                <div className="flex flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
                  <Timer className="h-4 w-4" />
                  <span>Timer</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="strength"
                className="rounded-none border-b px-3 py-4 data-[state=active]:bg-white data-[state=active]:text-black md:border-b-0 md:border-r"
                style={{ borderColor: T.rule }}
              >
                <div className="flex flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
                  <Dumbbell className="h-4 w-4" />
                  <span>Fuerza</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="hangboard"
                className="rounded-none border-r px-3 py-4 data-[state=active]:bg-white data-[state=active]:text-black"
                style={{ borderColor: T.rule }}
              >
                <div className="flex flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
                  <Hand className="h-4 w-4" />
                  <span>Campus</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="density"
                className="rounded-none px-3 py-4 data-[state=active]:bg-white data-[state=active]:text-black"
              >
                <div className="flex flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
                  <LayoutGrid className="h-4 w-4" />
                  <span>Densidad</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="timers" className="mt-0">
                <TimerStopwatch />
              </TabsContent>

              <TabsContent value="strength" className="mt-0">
                <StrengthSessions soundEnabled={soundEnabled} />
              </TabsContent>

              <TabsContent value="hangboard" className="mt-0">
                <HangboardSession soundEnabled={soundEnabled} />
              </TabsContent>

              <TabsContent value="density" className="mt-0">
                <DensityWall soundEnabled={soundEnabled} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
