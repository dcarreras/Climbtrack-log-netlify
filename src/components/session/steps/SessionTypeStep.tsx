import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Mountain, Dumbbell, Layers, ArrowLeft, Footprints } from 'lucide-react';

export type SessionTypeValue = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running';

interface SessionTypeStepProps {
  value: SessionTypeValue;
  onChange: (value: SessionTypeValue) => void;
  onNext: () => void;
  onBack?: () => void;
}

const sessionTypeOptions: { value: SessionTypeValue; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'boulder', 
    label: 'Boulder', 
    description: 'Solo bloques',
    icon: <Mountain className="h-8 w-8" />
  },
  { 
    value: 'rope', 
    label: 'Vías', 
    description: 'Autobelay o cuerda',
    icon: <Dumbbell className="h-8 w-8" />
  },
  { 
    value: 'hybrid', 
    label: 'Mixta', 
    description: 'Bloques y vías',
    icon: <Layers className="h-8 w-8" />
  },
  { 
    value: 'running', 
    label: 'Running', 
    description: 'Carrera y trail',
    icon: <Footprints className="h-8 w-8" />
  },
];

export default function SessionTypeStep({ value, onChange, onNext, onBack }: SessionTypeStepProps) {
  const handleSelect = (type: SessionTypeValue) => {
    onChange(type);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">¿Qué tipo de sesión vas a registrar?</h2>
        <p className="text-muted-foreground mt-2">Selecciona el tipo de escalada</p>
      </div>

      <div className="grid gap-4">
        {sessionTypeOptions.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all hover:border-primary ${
              value === option.value ? 'border-primary bg-primary/5 ring-2 ring-primary' : ''
            }`}
            onClick={() => handleSelect(option.value)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`p-3 rounded-full ${value === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {option.icon}
              </div>
              <div>
                <CardTitle className="text-lg">{option.label}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button 
            variant="outline" 
            size="lg"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
        )}
        <Button 
          className="flex-1 glow-primary" 
          size="lg"
          onClick={onNext}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
