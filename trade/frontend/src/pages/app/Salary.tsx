import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type SalaryStatus = {
  leftVolume: number;
  rightVolume: number;
  currentRank: string | null;
  ranks: Array<{ rankName: string; leftTarget: number; rightTarget: number; salary: number; isAchieved: boolean; leftProgress: number; rightProgress: number }>;
};

export default function SalaryPage() {
  const { data } = useQuery({ queryKey: ['salary-status'], queryFn: () => api<SalaryStatus>('/api/user/salary-status') });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-lg bg-white/5 border border-white/20">
          <CardHeader><CardTitle>Current Rank</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.currentRank ?? '—'}</CardContent>
        </Card>
        <Card className="backdrop-blur-lg bg-white/5 border border-white/20">
          <CardHeader><CardTitle>Total Left Business</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">${Number(data?.leftVolume ?? 0).toFixed(2)}</CardContent>
        </Card>
        <Card className="backdrop-blur-lg bg-white/5 border border-white/20">
          <CardHeader><CardTitle>Total Right Business</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">${Number(data?.rightVolume ?? 0).toFixed(2)}</CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.ranks?.map(r => (
          <Card key={r.rankName} className={`backdrop-blur-lg bg-white/5 border ${r.isAchieved ? 'border-green-400/40' : 'border-white/20'}`}>
            <CardHeader><CardTitle>{r.rankName} — ${r.salary}/mo</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm mb-2">Targets: L {r.leftTarget.toLocaleString()} / R {r.rightTarget.toLocaleString()}</div>
              <Progress label="Left" value={Math.round(r.leftProgress * 100)} />
              <Progress label="Right" value={Math.round(r.rightProgress * 100)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 w-full bg-white/10 rounded">
        <div className="h-2 bg-[#FFB900] rounded" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}


