import React, { useState } from 'react';
import { Shield, Lock, Mail, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, users, switchUser } = useAuth();
  const { settings } = useSystem();

  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin@123');
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = login(email, password);
      if (ok) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleSelectRoleCredentials = (u: any) => {
    setEmail(u.email);
    setPassword(u.password || 'admin@123');
    setError('');
  };

  const handleQuickPersona = (userId: string) => {
    switchUser(userId);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting in RDX crimson red */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b71234]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b71234]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl overflow-hidden bg-black items-center justify-center shadow-lg border border-border/30 mb-1">
            <img src="/rdx-logo.png" alt="RDX" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {settings.branding.companyName}
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            {settings.branding.appTitle}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-elevated space-y-5">
          <div className="border-b border-border/80 pb-3">
            <h2 className="text-base font-bold text-foreground">Enterprise Single Sign-On</h2>
            <p className="text-xs text-muted-foreground">Sign in with your corporate credentials</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {forgotSent && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Password reset link simulated and sent to your email.
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <Input
              label="Corporate Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Encrypted Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                <input type="checkbox" defaultChecked className="rounded text-primary w-3.5 h-3.5" />
                <span>Remember session</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotSent(true)}
                className="text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="md">
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Persona Logins with Credentials Directory */}
          <div className="pt-4 border-t border-border/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Demo Credentials Directory
              </span>
              <span className="text-[10px] text-muted-foreground">Click to auto-fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectRoleCredentials(u)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all group ${
                    email === u.email
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/80 bg-muted/20 hover:bg-muted hover:border-primary/40'
                  }`}
                  title={`Click to fill: ${u.email} / ${u.password || 'admin@123'}`}
                >
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-border"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground truncate text-[11px] group-hover:text-primary">
                        {u.roleName}
                      </p>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-background border border-border text-muted-foreground">
                        {u.password || 'admin@123'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>AES-256 Encrypted Session • RBAC Enforced</span>
        </div>
      </div>
    </div>
  );
};
