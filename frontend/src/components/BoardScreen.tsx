import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  MapPin,
  Clock,
  Users,
  Compass,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface BoardScreenProps {
  user: any;
  userCoords: { lat: number; lng: number };
  savedPlaces: any[];
  onOpenPostSheet: () => void;
  onOpenTrip: (tripId: string) => void;
}

export const BoardScreen: React.FC<BoardScreenProps> = ({
  userCoords,
  savedPlaces,
  onOpenPostSheet,
  onOpenTrip,
}) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [presenceActive, setPresenceActive] = useState<boolean>(true);
  const [presenceMinutes, setPresenceMinutes] = useState<30 | 60 | 120>(30);
  const [presenceExpiresAt, setPresenceExpiresAt] = useState<number>(Date.now() + 30 * 60 * 1000);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Fetch nearby trips
  const fetchNearbyTrips = async () => {
    try {
      const data = await api.getNearbyTrips(userCoords.lat, userCoords.lng);
      setTrips(data.trips || []);
    } catch (e) {
      console.error('Fetch trips error:', e);
    }
  };

  // Update presence on server
  const sendPresenceUpdate = async (mins: number = presenceMinutes) => {
    try {
      await api.updatePresence(userCoords.lat, userCoords.lng, mins);
      setPresenceExpiresAt(Date.now() + mins * 60 * 1000);
      setPresenceActive(true);
    } catch (e) {
      console.error('Presence error:', e);
    }
  };

  // Initial load & Polling (5-10s) paused when page hidden (Page Visibility API)
  useEffect(() => {
    fetchNearbyTrips();
    sendPresenceUpdate();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNearbyTrips();
        // Refresh presence if active
        if (presenceActive && Date.now() < presenceExpiresAt) {
          sendPresenceUpdate();
        }
      }
    }, 7000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNearbyTrips();
        sendPresenceUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userCoords.lat, userCoords.lng, presenceActive]);

  const handleTogglePresence = async () => {
    if (presenceActive) {
      setPresenceActive(false);
    } else {
      await sendPresenceUpdate(presenceMinutes);
    }
  };

  const handleJoinTrip = async (tripId: string) => {
    setJoiningId(tripId);
    setJoinError(null);
    try {
      await api.joinTrip(tripId);
      onOpenTrip(tripId);
    } catch (err: any) {
      if (err.status === 409) {
        setJoinError('This ride is full or you are already in another live trip.');
      } else if (err.status === 403) {
        setJoinError('You cannot join this ride.');
      } else {
        setJoinError(err.message || 'Could not join ride.');
      }
    } finally {
      setJoiningId(null);
    }
  };

  // Remaining presence minutes
  const remainingPresenceMins = Math.max(0, Math.ceil((presenceExpiresAt - Date.now()) / 60000));

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* "I'm around" Presence Banner (Section 5.1) */}
      <div className={`presence-pill-bar ${presenceActive ? '' : 'inactive'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="live-dot" style={{ background: presenceActive ? '#10B981' : '#64748B', boxShadow: presenceActive ? '0 0 10px #10B981' : 'none' }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
              {presenceActive ? `"I'm around" (${remainingPresenceMins}m left)` : `"I'm around" is Paused`}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {presenceActive ? 'You will get pinged for trips to your saved places' : 'Turn on to get pinged by nearby riders'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {presenceActive && (
            <select
              value={presenceMinutes}
              onChange={(e) => {
                const m = Number(e.target.value) as 30 | 60 | 120;
                setPresenceMinutes(m);
                sendPresenceUpdate(m);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFF',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.72rem',
              }}
            >
              <option value={30}>30m</option>
              <option value={60}>60m</option>
              <option value={120}>120m</option>
            </select>
          )}
          <button
            onClick={handleTogglePresence}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
          >
            {presenceActive ? 'Pause' : 'Turn On'}
          </button>
        </div>
      </div>

      {/* Main "Going Now" Big Action Callout */}
      <div style={{ padding: '12px 20px 8px' }}>
        <button
          onClick={onOpenPostSheet}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem', letterSpacing: '-0.01em' }}
        >
          <Sparkles size={20} /> Going Now (Post a Ride)
        </button>
      </div>

      {/* Quick Saved Place Chips */}
      {savedPlaces.length > 0 && (
        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Quick Destinations
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {savedPlaces.slice(0, 6).map((sp) => (
              <button
                key={sp.id}
                onClick={onOpenPostSheet}
                className="quick-chip"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MapPin size={13} color="var(--accent-primary)" />
                {sp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Rides Feed */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#FFF' }}>Live Rides Nearby</h2>
          <button
            onClick={fetchNearbyTrips}
            style={{ background: 'none', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {joinError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', marginBottom: '14px' }}>
            {joinError}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="glass-card" style={{ padding: '36px 20px', textAlign: 'center', margin: '8px 0' }}>
            <Compass size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.05rem', color: '#FFF', marginBottom: '6px' }}>No one leaving near you right now</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4', maxWidth: '300px', margin: '0 auto 16px' }}>
              Discovery is on-the-spot. Start a trip now and Chalo will ping physical neighbours who have your destination saved!
            </p>
            <button onClick={onOpenPostSheet} className="btn-primary" style={{ margin: '0 auto', padding: '10px 20px', fontSize: '0.9rem' }}>
              Start First Ride
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trips.map((t) => {
              const nowSec = Math.floor(Date.now() / 1000);
              const minsLeft = Math.max(0, Math.ceil((t.expiresAt - nowSec) / 60));
              return (
                <div key={t.id} className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>{t.place}</span>
                        <span className={`badge badge-${t.kind}`}>{t.kind}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Started by <strong>{t.poster}</strong> • <span style={{ color: '#10B981' }}>{t.distanceM}m away</span>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: '#FF7A00', background: 'rgba(255, 107, 0, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {minsLeft}m left
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <Users size={16} color="var(--accent-primary)" />
                      <span><strong>{t.going}</strong> going • <span style={{ color: '#10B981' }}>{t.seatsLeft} seat{t.seatsLeft !== 1 ? 's' : ''} left</span></span>
                    </div>

                    <button
                      onClick={() => handleJoinTrip(t.id)}
                      disabled={joiningId === t.id}
                      className="btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                    >
                      {joiningId === t.id ? 'Joining...' : 'Join Ride'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
