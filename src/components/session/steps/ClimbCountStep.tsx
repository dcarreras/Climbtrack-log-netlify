import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import type { SessionTypeValue } from './SessionTypeStep';

interface ClimbCountStepProps {
  sessionType: SessionTypeValue;
  count: number;
  onChange: (count: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ClimbCountStep({ sessionType, count, onChange, onNext, onBack }: ClimbCountStepProps) {
  const getLabel = () => {
    if (sessionType === 'boulder') return 'bloques';
    if (sessionType === 'rope') return 'vías';
    return 'escaladas (bloques + vías)';
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">¿Cuántas {getLabel()} has hecho?</h2>
        <p className="text-muted-foreground mt-2">Después introducirás los datos de cada una</p>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full text-xl sm:text-2xl"
              onClick={() => onChange(Math.max(1, count - 1))}
              disabled={count <= 1}
            >
              <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            
            <div className="text-center">
              <span className="text-5xl sm:text-6xl font-bold">{count}</span>
              <p className="text-muted-foreground mt-2">{getLabel()}</p>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full text-xl sm:text-2xl"
              onClick={() => onChange(count + 1)}
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {[3, 5, 8, 10, 15].map((num) => (
          <Button
            key={num}
            variant={count === num ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => onChange(num)}
          >
            {num}
          </Button>
        ))}
      </div>

      <Button 
        className="w-full glow-primary" 
        size="lg"
        onClick={onNext}
      >
        Continuar con las {count} {getLabel()}
      </Button>
    </div>
  );
}
