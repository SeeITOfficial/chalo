import React, { useState } from 'react';
import { api } from '../api';
import { X, ArrowRight } from 'lucide-react';

interface DestinationDetailModalProps {
  place: any;
  matchingTrips: any[];
  user: any;
  userCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onTripJoined: (tripId: string) => void;
  onTripCreated: (trip: any) => void;
}

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  place,
  matchingTrips,
  user,
  userCoords,
  onClose,
  onTripJoined,
  onTripCreated,
}) => {
  const [minutes, setMinutes] = useState<5 | 10 | 15>(10);
  const [seats, setSeats] = useState<1 | 2 | 3>(2);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(matchingTrips.length === 0);

  // Check if night (8pm-6am IST)
  const isNightIST = () => {
    const IST_OFFSET = 19800;
    const nowSec = Math.floor(Date.now() / 1000);
    const istHour = Math.floor((((nowSec + IST_OFFSET) % 86400 + 86400) % 86400) / 3600);
    return istHour >= 20 || istHour < 6;
  };
  const isNight = isNightIST();
  const isFemale = user?.gender === 'female';

  const handleJoin = async (tripId: string) => {
    setJoiningId(tripId);
    setError(null);
    try {
      await api.joinTrip(tripId);
      onTripJoined(tripId);
    } catch (err: any) {
      if (err.status === 409) {
        setError('This ride is full or you are already in an active ride.');
      } else {
        setError(err.message || 'Could not join ride');
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handlePostTrip = async () => {
    if (!userCoords) {
      setError('Please allow location to post a ride.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.postTrip({
        placeId: place.id,
        lat: userCoords.lat,
        lng: userCoords.lng,
        minutes,
        seats,
        openToAll: isNight && isFemale ? false : true,
      });
      onTripCreated(res);
    } catch (err: any) {
      if (err.message === 'already_have_live_trip') {
        setError('You already have an active live ride.');
      } else if (err.status === 429) {
        setError('Please wait a moment before creating another ride.');
      } else {
        setError(err.message || 'Could not post ride.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '4px' }}>{place.name}</h2>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {matchingTrips.length > 0 ? `${matchingTrips.length} leaving now` : 'Nobody leaving yet'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Existing trips to this destination */}
        {matchingTrips.length > 0 && !showCreateForm ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {matchingTrips.map((t) => {
                const nowSec = Math.floor(Date.now() / 1000);
                const minsLeft = Math.max(1, Math.ceil((t.expiresAt - nowSec) / 60));
                return (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {t.poster}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <strong>{t.going}</strong> going · <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{t.seatsLeft} seat{t.seatsLeft !== 1 ? 's' : ''} left</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                        {minsLeft} min left
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJoin(t.id)}
                      disabled={joiningId === t.id}
                      className="btn-primary"
                      style={{ minHeight: '48px', fontSize: '16px' }}
                    >
                      {joiningId === t.id ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              Or start your own ride
            </button>
          </div>
        ) : (
          /* Nobody yet (or user chose to start their own ride): 2-tap post form! */
          <div>
            {matchingTrips.length === 0 && (
              <p style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>
                Nobody yet. Leave now and we'll alert people near you!
              </p>
            )}

            {/* Leave in picker: 5/10/15 min */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Leaving in:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {([5, 10, 15] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    style={{
                      minHeight: '48px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '16px',
                      fontWeight: 700,
                      border: '2px solid',
                      borderColor: minutes === m ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: minutes === m ? 'var(--primary-light)' : '#FFFFFF',
                      color: minutes === m ? 'var(--primary)' : 'var(--text-main)',
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Seats wanted picker: 1/2/3 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Seats you can share (excluding you):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeats(s)}
                    style={{
                      minHeight: '48px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '16px',
                      fontWeight: 700,
                      border: '2px solid',
                      borderColor: seats === s ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: seats === s ? 'var(--primary-light)' : '#FFFFFF',
                      color: seats === s ? 'var(--primary)' : 'var(--text-main)',
                    }}
                  >
                    {s} {s === 1 ? 'seat' : 'seats'}
                  </button>
                ))}
              </div>
            </div>


            {/* One big "I'm leaving" button! */}
            <button
              type="button"
              onClick={handlePostTrip}
              disabled={loading}
              className="btn-primary"
            >
              <span>{loading ? 'Posting...' : "I'm leaving"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
