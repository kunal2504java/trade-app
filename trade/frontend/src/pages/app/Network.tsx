import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Genealogy = { root: string; nodes: Array<{ id: string; full_name: string; sponsor_id: string | null; position_in_sponsor_tree: 'L'|'R'; depth: number }> };

export default function NetworkPage() {
  const { data } = useQuery({ queryKey: ['genealogy'], queryFn: () => api<Genealogy>('/api/network/genealogy') });

  return (
    <Card>
      <CardHeader><CardTitle>My Network</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data?.nodes?.map(node => (
            <div key={node.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{Array(node.depth).fill('—').join('')}</span>
              <span className="font-medium">{node.full_name}</span>
              <span className="text-xs">[{node.position_in_sponsor_tree}]</span>
            </div>
          ))}
          {!data?.nodes?.length && <div className="text-sm text-muted-foreground">No downline yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}


