import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import TimerStopwatch from '@/components/timer/TimerStopwatch';
import StrengthSessions from '@/components/timer/StrengthSessions';
import HangboardSession from '@/components/timer/HangboardSession';
import DensityWall from '@/components/timer/DensityWall';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Timer, Dumbbell, Hand, LayoutGrid, Volume2, VolumeX } from 'lucide-react';

export default function TimerPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <AppLayout>
      <div className="py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Entrenamiento</h1>
          <div className="flex items-center gap-2">
            {soundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </div>

        <Tabs defaultValue="timers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="timers" className="flex flex-col items-center gap-1 py-2 text-xs">
              <Timer className="h-4 w-4" />
              <span>Timers</span>
            </TabsTrigger>
            <TabsTrigger value="strength" className="flex flex-col items-center gap-1 py-2 text-xs">
              <Dumbbell className="h-4 w-4" />
              <span>Fuerza</span>
            </TabsTrigger>
            <TabsTrigger value="hangboard" className="flex flex-col items-center gap-1 py-2 text-xs">
              <Hand className="h-4 w-4" />
              <span>Campus</span>
            </TabsTrigger>
            <TabsTrigger value="density" className="flex flex-col items-center gap-1 py-2 text-xs">
              <LayoutGrid className="h-4 w-4" />
              <span>Densidad</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timers">
            <TimerStopwatch />
          </TabsContent>

          <TabsContent value="strength">
            <StrengthSessions soundEnabled={soundEnabled} />
          </TabsContent>

          <TabsContent value="hangboard">
            <HangboardSession soundEnabled={soundEnabled} />
          </TabsContent>

          <TabsContent value="density">
            <DensityWall soundEnabled={soundEnabled} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
