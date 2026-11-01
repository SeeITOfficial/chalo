import React, { useState } from 'react';
import { api } from '../api';
import { MapPin, Bell, Check, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  user?: any;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onComplete }) => {
  const [gender, setGender] = useState<string>(user?.gender || 'unspecified');
  const [locStatus, setLocStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [notifStatus, setNotifStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const handleGenderSelect = async (g: 'female' | 'male' | 'other' | 'unspecified') => {
    setGender(g);
    try {
      await api.updateGender(g);
    } catch (e) {
      console.error('Failed to update gender:', e);
    }
  };

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocStatus('granted'),
        () => setLocStatus('denied'),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocStatus('denied');
    }
  };

  const requestNotification = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm === 'granted' ? 'granted' : 'denied');
    } else {
      setLocStatus('denied');
    }
  };

  const handleFinish = async () => {
    if (gender && gender !== user?.gender) {
      try {
        await api.updateGender(gender as any);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('chalo_onboarded', 'true');
    onComplete();
  };

  return (
    <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>
            Welcome to <span style={{ color: 'var(--primary)' }}>Chalo</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '17px', fontWeight: 500 }}>
            Share your ride, split the fare.
          </p>
        </div>

        {/* 3 Short Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', marginBottom: '2px' }}>Pick where you're going</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Save your frequent destinations like Railway Station or your Society.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', marginBottom: '2px' }}>We tell people near you</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Anyone nearby heading the same way gets an alert when you leave.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', marginBottom: '2px' }}>Meet, take an auto, split the fare</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Take any auto together and agree the fare directly with the driver.</div>
            </div>
          </div>
        </div>

        {/* Gender Selection (at start of app, without mentioning night rule) */}
        <div style={{ borderTop: '1.5px solid var(--border-subtle)', paddingTop: '20px', marginBottom: '20px' }}>
          <label style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
            Gender
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { id: 'female', label: 'Female' },
              { id: 'male', label: 'Male' },
              { id: 'other', label: 'Other' },
              { id: 'unspecified', label: 'Prefer not to say' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleGenderSelect(item.id as any)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: gender === item.id ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                  backgroundColor: gender === item.id ? 'var(--primary-light)' : '#FFFFFF',
                  color: gender === item.id ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {gender === item.id && <Check size={16} />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions with Plain Reasons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Location Permission */}
          <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <MapPin size={18} color="var(--primary)" />
                Location
              </div>
              {locStatus === 'granted' ? (
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={16} /> Allowed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="btn-secondary"
                  style={{ minHeight: '34px', padding: '4px 12px', fontSize: '13px' }}
                >
                  Allow
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.35' }}>
              Needed to find other riders leaving right now within 100 meters of you.
            </p>
          </div>

          {/* Notification Permission */}
          <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <Bell size={18} color="var(--primary)" />
                Notifications
              </div>
              {notifStatus === 'granted' ? (
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={16} /> Allowed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestNotification}
                  className="btn-secondary"
                  style={{ minHeight: '34px', padding: '4px 12px', fontSize: '13px' }}
                >
                  Allow
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.35' }}>
              We only alert you when someone near you is leaving for one of your saved places.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          type="button"
          onClick={handleFinish}
          className="btn-primary"
        >
          <span>Continue</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
