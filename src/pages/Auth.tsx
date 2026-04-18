import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Lock, Mail, Mountain } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const authSchema = z.object({
  email: z.string().email('Introduce un email valido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type AuthMode = 'signin' | 'signup';
const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === 'true';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user && !loading) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: { email?: string; password?: string } = {};
        error.errors.forEach((issue) => {
          if (issue.path[0] === 'email') nextErrors.email = issue.message;
          if (issue.path[0] === 'password') nextErrors.password = issue.message;
        });
        setErrors(nextErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (mode === 'signup' && !ALLOW_SIGNUP) {
      setMode('signin');
      toast.error('El alta desde la app está desactivada en este entorno');
      return;
    }

    setIsLoading(true);
    const isSignupMode = ALLOW_SIGNUP && mode === 'signup';
    const authAction = isSignupMode ? signUp : signIn;
    const { error } = await authAction(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email o contraseña incorrectos');
      } else if (error.message.includes('already registered')) {
        toast.error('Ese email ya existe. Entra con tu cuenta principal.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(
      isSignupMode
        ? 'Cuenta creada. Revisa el email si Supabase pide confirmación.'
        : 'Sesión iniciada',
    );
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Mountain className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full animate-slide-up">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 glow-primary">
              <Mountain className="h-8 w-8 text-primary" />
            </div>
            <span className="font-display text-3xl text-foreground">CLIMBTRACKER</span>
          </div>

          <Card className="card-elevated border-border/50">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-2xl">Registro personal</CardTitle>
              <CardDescription>
                {ALLOW_SIGNUP
                  ? 'Entra con tu cuenta principal. El alta queda solo para la cuenta inicial.'
                  : 'Entra con tu cuenta principal. El alta desde esta app está cerrada.'}
              </CardDescription>
              {ALLOW_SIGNUP ? (
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1">
                  <Button
                    type="button"
                    variant={mode === 'signin' ? 'default' : 'ghost'}
                    onClick={() => setMode('signin')}
                  >
                    Entrar
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'signup' ? 'default' : 'ghost'}
                    onClick={() => setMode('signup')}
                  >
                    Crear cuenta
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  Si necesitas otra cuenta, actívala primero desde Supabase y vuelve a abrir el registro.
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? mode === 'signin' || !ALLOW_SIGNUP
                      ? 'Entrando...'
                      : 'Creando cuenta...'
                    : mode === 'signin' || !ALLOW_SIGNUP
                      ? 'Entrar'
                      : 'Crear cuenta inicial'}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/" className="transition-colors hover:text-foreground">
                  Volver al inicio de la app
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
