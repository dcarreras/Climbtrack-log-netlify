import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Scale, Save, SkipForward } from 'lucide-react';

interface WeightStepProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function WeightStep({ value, onChange, onSubmit, onBack, isSubmitting }: WeightStepProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">Peso corporal</h2>
        <p className="text-muted-foreground mt-2">Este dato es opcional pero útil para el seguimiento</p>
      </div>

      <Card className="card-elevated">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Peso actual
          </CardTitle>
          <CardDescription>
            Registra tu peso para hacer un seguimiento a largo plazo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          <div className="flex items-center gap-4 justify-center">
            <Input
              type="number"
              step="0.1"
              placeholder="70.5"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="max-w-28 text-xl sm:text-2xl text-center h-12 sm:h-14"
            />
            <span className="text-xl text-muted-foreground">kg</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button 
          className="w-full glow-primary" 
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Guardando sesión...' : 'Guardar Sesión'}
        </Button>
        
        {!value && (
          <Button 
            variant="ghost"
            className="w-full" 
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Omitir y guardar
          </Button>
        )}
      </div>
    </div>
  );
}
