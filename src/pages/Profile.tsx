import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Settings, Save, Camera, Loader2, Footprints } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { StravaConnect } from '@/components/strava/StravaConnect';

type GradeSystem = Database['public']['Enums']['grade_system'];

const gradeSystems: { value: GradeSystem; label: string }[] = [
  { value: 'v-grade', label: 'V-Scale (V0, V4, V8)' },
  { value: 'font', label: 'Font (4a, 6b+, 7c)' },
  { value: 'french', label: 'French (5a, 6c, 8a)' },
  { value: 'yds', label: 'YDS (5.10a, 5.12c)' },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState('');
  const [gradeSystem, setGradeSystem] = useState<GradeSystem>('v-grade');
  const [units, setUnits] = useState('kg');
  const [weeklyRunningKmGoal, setWeeklyRunningKmGoal] = useState('20');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setGradeSystem(profile.default_grade_system || 'v-grade');
      setUnits(profile.units || 'kg');
      setWeeklyRunningKmGoal(profile.weekly_running_km_goal?.toString() || '20');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: newAvatarUrl });

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto de perfil actualizada');
    } catch (error: any) {
      toast.error('Error al subir la foto: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          display_name: displayName || null,
          default_grade_system: gradeSystem,
          units,
          weekly_running_km_goal: parseFloat(weeklyRunningKmGoal) || 20,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated!');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-sm text-muted-foreground">Haz clic en el icono para cambiar tu foto</p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre</Label>
              <Input
                id="displayName"
                placeholder="Tu nombre"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gradeSystem">Default Grade System</Label>
              <Select value={gradeSystem} onValueChange={(v) => setGradeSystem(v as GradeSystem)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeSystems.map((gs) => (
                    <SelectItem key={gs.value} value={gs.value}>
                      {gs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="units">Weight Units</Label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-cyan-500" />
              Objetivos Running
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weeklyKmGoal">Objetivo semanal de km</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="weeklyKmGoal"
                  type="number"
                  min="0"
                  step="1"
                  value={weeklyRunningKmGoal}
                  onChange={(e) => setWeeklyRunningKmGoal(e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground">km / semana</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Este objetivo se usará en el dashboard de Running para mostrar tu progreso semanal.
              </p>
            </div>
          </CardContent>
        </Card>

        <StravaConnect />

        <div className="flex gap-4">
          <Button 
            onClick={handleSubmit}
            className="flex-1"
            disabled={updateProfile.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card className="card-elevated border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={async () => {
                await signOut();
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
