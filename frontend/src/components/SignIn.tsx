import React, { useState } from 'react';
import { api } from '../api';
import { Users, Shield, Zap, Sparkles } from 'lucide-react';

interface SignInProps {
  onSuccess: (user: any) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSuccess }) => {
  const [googleTokenInput, setGoogleTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMockLogin = async (sub: string, name: string, gender: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.authGoogle(`mock:${sub}:${name}:${gender}`);
      const me = await api.getMe();
      onSuccess(me);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleTokenInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.authGoogle(googleTokenInput.trim());
      const me = await api.getMe();
      onSuccess(me);
    } catch (err: any) {
      setError(err.message || 'Invalid Google token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
      <div>
        {/* Logo & Headline */}
        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              चलो
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#FFFFFF' }}>
              Chalo
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.4', maxWidth: '320px', margin: '0 auto' }}>
            "I'm leaving now. Who else near me is going where I'm going?"
          </p>
        </div>

        {/* Value Proposition Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(255, 107, 0, 0.15)', padding: '10px', borderRadius: '12px', color: '#FF7A00' }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFF' }}>On-The-Spot Discovery</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Find 2-3 others leaving right now and split the auto fare.</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '12px', color: '#10B981' }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFF' }}>Zero Middlemen, Pure Direct</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No drivers, no app booking fees. Meet, agree the fare with the driver, split equally.</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '12px', color: '#C084FC' }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFF' }}>Night Women-Only Safety</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Between 8pm–6am IST, trips by women default to women-only automatically.</div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Demo Fast Login Riders (Pilot Testing) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', textAlign: 'center' }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Quick Demo Riders (Pilot Cluster)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => handleMockLogin('anita-vadodara', 'Anita', 'female')}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.85rem', justifyContent: 'flex-start' }}
            >
              👩 Anita <span style={{ color: '#F472B6', fontSize: '0.75rem' }}>(F)</span>
            </button>
            <button
              onClick={() => handleMockLogin('rahul-vadodara', 'Rahul', 'male')}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.85rem', justifyContent: 'flex-start' }}
            >
              👨 Rahul <span style={{ color: '#60A5FA', fontSize: '0.75rem' }}>(M)</span>
            </button>
            <button
              onClick={() => handleMockLogin('priya-vadodara', 'Priya', 'female')}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.85rem', justifyContent: 'flex-start' }}
            >
              👩 Priya <span style={{ color: '#F472B6', fontSize: '0.75rem' }}>(F)</span>
            </button>
            <button
              onClick={() => handleMockLogin('dev-vadodara', 'Dev', 'male')}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '10px 12px', fontSize: '0.85rem', justifyContent: 'flex-start' }}
            >
              👨 Dev <span style={{ color: '#60A5FA', fontSize: '0.75rem' }}>(M)</span>
            </button>
          </div>
        </div>

        {/* Google Sign-In Input or Action */}
        <form onSubmit={handleGoogleTokenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Paste Google ID Token (or type name for test)"
            value={googleTokenInput}
            onChange={(e) => setGoogleTokenInput(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#FFF',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !googleTokenInput.trim()}
            className="btn-primary"
            style={{ width: '100%', opacity: loading || !googleTokenInput.trim() ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In with Google'}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '24px' }}>
        Vadodara Pilot Cluster: Parul University Gate • Station Route • Waghodia
      </div>
    </div>
  );
};
