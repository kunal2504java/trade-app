import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge'; // Import Badge component

// Add 'status' to the transaction type
type Tx = { 
  id: string; 
  amount: number; 
  type: 'credit'|'debit'; 
  income_source: string; 
  description: string; 
  timestamp: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED'; // Add status field
};

export default function WalletPage() {
  const qc = useQueryClient();
  
  // --- Data Fetching ---
  const { data: balanceData, refetch: refetchBalance } = useQuery({ queryKey: ['wallet','balance'], queryFn: () => api<{ balance: number }>(`/api/wallet/balance`) });
  const { data: txData, refetch: refetchTransactions } = useQuery({ queryKey: ['wallet','tx'], queryFn: () => api<{ items: Tx[] }>(`/api/wallet/transactions`) });

  // --- State for Withdraw Dialog ---
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawClientError, setWithdrawClientError] = useState<string | null>(null);
  const [withdrawServerError, setWithdrawServerError] = useState<string | null>(null);

  // --- NEW: State for Deposit Dialog ---
  const [depositAmount, setDepositAmount] = useState('');
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositServerError, setDepositServerError] = useState<string | null>(null);
  const [depositSuccessMessage, setDepositSuccessMessage] = useState<string | null>(null);

  // --- Mutations ---
  const withdrawMutation = useMutation({
    mutationFn: () => api(`/api/wallet/withdraw`, { method: 'POST', body: { amount: Number(withdrawAmount) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
    },
    onError: (err: any) => setWithdrawServerError(err?.message || 'Withdrawal failed'),
  });
  
  // --- NEW: Mutation for Deposit Request ---
  const depositRequestMutation = useMutation({
    mutationFn: () => api(`/api/wallet/deposit-request`, { method: 'POST', body: { amount: Number(depositAmount) } }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['wallet','tx'] }); // Refresh transactions to show pending request
      setDepositSuccessMessage(data.message || 'Request submitted!');
      setDepositAmount('');
      setTimeout(() => setDepositOpen(false), 2000); // Close dialog after 2 seconds
    },
    onError: (err: any) => setDepositServerError(err?.message || 'Deposit request failed'),
    onSettled: () => setTimeout(() => {
        setDepositSuccessMessage(null);
        setDepositServerError(null);
    }, 3000)
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Wallet Balance</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="text-3xl font-semibold">${Number(balanceData?.balance ?? 0).toFixed(2)}</div>
          
          {/* --- NEW: Deposit Request Button & Dialog --- */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Request Deposit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Deposit</DialogTitle></DialogHeader>
              {depositSuccessMessage ? (
                  <div className="text-center p-4 text-green-600">{depositSuccessMessage}</div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Enter the amount you wish to deposit. An admin will review your request.</p>
                  <Input 
                    placeholder="Amount ($)" 
                    value={depositAmount} 
                    type="number"
                    onChange={(e) => setDepositAmount(e.target.value)} 
                  />
                  <div className="mt-4 flex justify-end">
                    {depositServerError && <div className="mr-4 text-sm text-red-500">{depositServerError}</div>}
                    <Button 
                      onClick={() => depositRequestMutation.mutate()} 
                      disabled={depositRequestMutation.isPending || !depositAmount || Number(depositAmount) <= 0}>
                        Submit Request
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* --- Existing Withdraw Button & Dialog --- */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button>Withdraw Funds</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Withdraw</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                <Input placeholder="Amount" value={withdrawAmount} onChange={(e) => {
                  const v = e.target.value;
                  setWithdrawAmount(v);
                  const num = Number(v);
                  setWithdrawClientError(isNaN(num) || num < 100 ? 'Amount must be at least $100' : null);
                }} />
                <div className="text-xs text-muted-foreground">Minimum withdrawal: $100</div>
                {withdrawClientError && <div className="text-xs text-red-500">{withdrawClientError}</div>}
                <Input placeholder="Wallet Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} />
              </div>
              <div className="mt-4 flex justify-end">
                {withdrawServerError && <div className="mr-4 text-sm text-red-500">{withdrawServerError}</div>}
                <Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending || Boolean(withdrawClientError)}>Confirm</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
          {/* ... Search Input ... */}
          <div className="space-y-2">
            {txData?.items?.map(t => (
              <div key={t.id} className="flex justify-between items-center border-b border-border pb-2">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {t.description || t.income_source}
                    {/* NEW: Show status badge */}
                    {t.status === 'PENDING' && <Badge variant="secondary">Pending</Badge>}
                    {t.status === 'FAILED' && <Badge variant="destructive">Failed</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{new Date(t.timestamp).toLocaleString()}</div>
                </div>
                <div className={t.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                  {t.type === 'credit' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                </div>
              </div>
            ))}
            {!txData?.items?.length && <div className="text-sm text-muted-foreground">No transactions yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
