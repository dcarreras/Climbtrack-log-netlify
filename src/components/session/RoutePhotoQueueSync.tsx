import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { flushRoutePhotoQueue } from '@/lib/routePhotoQueue';

export default function RoutePhotoQueueSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return undefined;

    const syncQueue = async () => {
      const result = await flushRoutePhotoQueue();
      if (result.uploaded > 0) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
    };

    syncQueue();
    window.addEventListener('online', syncQueue);

    return () => {
      window.removeEventListener('online', syncQueue);
    };
  }, [queryClient, user]);

  return null;
}
