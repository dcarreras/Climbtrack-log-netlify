import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStrava } from '@/hooks/useStrava';
import { RefreshCw, Link2, Unlink, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const StravaConnect = () => {
  const {
    isConnected,
    connection,
    isLoading,
    isSyncing,
    connectStrava,
    disconnectStrava,
    isDisconnecting,
    syncActivities,
  } = useStrava();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Strava
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-8 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          Strava
          {isConnected && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
              Conectado
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isConnected
            ? 'Sincroniza tus actividades de running automáticamente'
            : 'Conecta tu cuenta de Strava para importar actividades'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Conectado desde:{' '}
              {connection?.created_at &&
                format(new Date(connection.created_at), "d 'de' MMMM yyyy", { locale: es })}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={syncActivities}
                disabled={isSyncing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
              
              <Button
                onClick={() => disconnectStrava()}
                disabled={isDisconnecting}
                variant="destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={connectStrava} className="bg-orange-500 hover:bg-orange-600">
            <Link2 className="h-4 w-4 mr-2" />
            Conectar con Strava
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
