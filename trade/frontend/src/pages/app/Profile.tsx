import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Profile = { id: string; full_name: string; email: string; referral_code: string; sponsor_id: string | null; position_in_sponsor_tree: 'L'|'R'|null; created_at: string };

export default function ProfilePage() {
  const { data } = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/api/user/profile') });
  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><span className="text-muted-foreground">Name:</span> {data?.full_name}</div>
        <div><span className="text-muted-foreground">Email:</span> {data?.email}</div>
        <div><span className="text-muted-foreground">Referral Code:</span> <span className="font-mono">{data?.referral_code}</span></div>
        <div><span className="text-muted-foreground">Position:</span> {data?.position_in_sponsor_tree ?? '—'}</div>
        <div><span className="text-muted-foreground">Joined:</span> {data?.created_at ? new Date(data.created_at).toLocaleDateString() : '—'}</div>
      </CardContent>
    </Card>
  );
}


