import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState<'L' | 'R'>('L');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!sponsorCode) return setError('Sponsor referral code required');
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ full_name: string; referral_code: string }>(`/api/auth/sponsor/${encodeURIComponent(sponsorCode)}`);
        setSponsorName(res.full_name);
        setStep(2);
      } catch (err) {
        setSponsorName(null);
        setError(err instanceof Error ? err.message : 'Invalid sponsor code');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ full_name: fullName, email, password, sponsor_referral_code: sponsorCode, position });
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignIn = () => {
    // Redirect the user to the backend endpoint to start the Google OAuth flow
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl text-gold">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {step === 1 ? (
              <div>
                <label className="block mb-2">Sponsor Referral Code</label>
                <Input value={sponsorCode} onChange={(e) => setSponsorCode(e.target.value)} placeholder="e.g. ABC123XYZ" required />
                {sponsorName && (
                  <p className="mt-2 text-sm">Sponsor: <span className="font-medium">{sponsorName}</span></p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block mb-2">Full Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block mb-2">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
                </div>
                <div>
                  <label className="block mb-2">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
                </div>
                <div>
                  <label className="block mb-2">Choose Position under Sponsor</label>
                  <RadioGroup value={position} onValueChange={(v) => setPosition(v as 'L' | 'R')} className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L" id="pos-l" />
                      <label htmlFor="pos-l">Left</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="R" id="pos-r" />
                      <label htmlFor="pos-r">Right</label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button className="w-full bg-accent text-foreground hover:shadow-gold-glow" disabled={loading}>
              {loading ? 'Please wait...' : step === 1 ? 'Continue' : 'Create Account'}
            </Button>
          </form>

          {step === 2 && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or sign up with
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                Sign up with Google
              </Button>
            </>
          )}
          
          <div className="mt-4 text-center">
            <Link to="/login" className="text-accent hover:underline">Back to Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}