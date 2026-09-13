import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuthStore } from '../stores/authStore';
import warehouseImage from '../assets/login-steel-warehouse.jpg';
import brandMark from '../assets/watania-gear-mark.svg';
import './login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading, error, clearError } = useAuthStore();

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !email.trim() || !password) return;
    clearError();
    await signIn(email.trim(), password);
  };

  return (
    <main className="login-workspace">
      <img className="login-background" src={warehouseImage} alt="" loading="eager" decoding="async" />
      <div className="login-photo-shade" aria-hidden="true" />
      <section className="login-story" aria-label="Watania Steel">
        <div className="login-brand">
          <img src={brandMark} alt="" width="44" height="44" />
          <div><p>Watania Steel</p><span>Factory operations · Qatar</span></div>
        </div>
        <div className="login-story-copy">
          <h1>Factory operations,<br />in one place.</h1>
          <p>From the first order to the final delivery.<br />A clear view of the work ahead.</p>
        </div>
        <p className="login-story-footer">Al Watania Steel</p>
      </section>
      <section className="login-panel" aria-labelledby="signin-heading">
        <div className="login-form-content">
          <div className="login-form-heading">
            <p className="login-eyebrow">Sign in</p>
            <h2 id="signin-heading">Welcome back.</h2>
          </div>
          <form onSubmit={handleSignIn} id="signin-form" aria-busy={loading}>
            <div className="login-form-field">
              <Label htmlFor="signin-email">Work email</Label>
              <Input id="signin-email" name="email" type="email" autoComplete="username" inputMode="email"
                autoCapitalize="none" spellCheck={false} placeholder="you@company.com" value={email}
                onChange={event => { setEmail(event.target.value); if (error) clearError(); }} required disabled={loading} />
            </div>
            <div className="login-form-field">
              <Label htmlFor="signin-password">Password</Label>
              <div className="login-password-field">
                <Input id="signin-password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Enter your password" value={password}
                  onChange={event => { setPassword(event.target.value); if (error) clearError(); }} required disabled={loading} />
                <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="signin-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={loading}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" className="login-submit" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" aria-hidden="true" /> Signing in…</> : <>Sign in <ArrowRight aria-hidden="true" /></>}
            </Button>
          </form>
          <p className="login-help">Need access or help signing in?<br /><span>Contact your workspace administrator.</span></p>
        </div>
      </section>
    </main>
  );
}
