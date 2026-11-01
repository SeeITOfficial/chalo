import React, { useState } from 'react';
import { api } from '../api';
import { Shield, MapPin, Bell, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onComplete }) => {
  const [gender, setGender] = useState<'female' | 'male' | 'other' | 'unspecified'>(user?.gender || 'unspecified');
  const [locGranted, setLocGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocGranted(true),
        () => setLocGranted(false)
      );
    }
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifGranted(true);
      }
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (gender !== user.gender) {
        await api.updateGender(gender);
      }
      const updated = await api.getMe();
      localStorage.setItem('chalo_onboarded', 'true');
      onComplete(updated);
    } catch (e) {
      console.error(e);
      onComplete(user);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sheet-overlay" style={{ alignItems: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '24px', background: '#111624' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '8px', color: '#FFF' }}>
          Welcome to Chalo!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.4' }}>
          Before you discover rides leaving right now, customize your preferences.
        </p>

        {/* Gender Selection & Night Rule Explanation */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={16} color="#C084FC" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Gender (Optional & Self-Declared)</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '10px', lineHeight: '1.35' }}>
            Only used for the <strong>Night Women-Only rule (8pm–6am IST)</strong>. Skipping this means you will not receive women-only night pings.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {(['female', 'male', 'other', 'unspecified'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`quick-chip ${gender === g ? 'selected' : ''}`}
                style={{ textAlign: 'center', textTransform: 'capitalize' }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={18} color="#10B981" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Location Access</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Used to match people within 100m</div>
              </div>
            </div>
            {locGranted ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <button onClick={requestLocation} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Allow
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color="#FF6B00" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Web Push Pings</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Ping when someone leaves for your saved place</div>
              </div>
            </div>
            {notifGranted ? (
              <CheckCircle2 size={20} color="#10B981" />
            ) : (
              <button onClick={requestNotifications} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Allow
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          {saving ? 'Saving...' : 'Enter Chalo'}
        </button>
      </div>
    </div>
  );
};
