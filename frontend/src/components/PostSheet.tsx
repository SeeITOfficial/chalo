import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X, Clock, Users, Shield, Plus, Check } from 'lucide-react';

interface PostSheetProps {
  user: any;
  userCoords: { lat: number; lng: number };
  savedPlaces: any[];
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

export const PostSheet: React.FC<PostSheetProps> = ({
  user,
  userCoords,
  savedPlaces,
  onClose,
  onTripCreated,
}) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(savedPlaces[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [minutes, setMinutes] = useState<5 | 10 | 15>(10);
  const [seats, setSeats] = useState<1 | 2 | 3>(2);
  const [openToAll, setOpenToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Place modal state
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceKind, setNewPlaceKind] = useState<'society' | 'mall' | 'office' | 'other'>('society');

  // Check if current IST time is night (8pm - 6am IST)
  const isNightIST = () => {
    const IST_OFFSET = 19800;
    const nowSec = Math.floor(Date.now() / 1000);
    const istHour = Math.floor((((nowSec + IST_OFFSET) % 86400 + 86400) % 86400) / 3600);
    return istHour >= 20 || istHour < 6;
  };

  const isNight = isNightIST();
  const isFemale = user?.gender === 'female';

  // Search places as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getPlaces(searchQuery.trim());
        setSearchResults(res.places || []);
      } catch (e) {
        console.error(e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateNewPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;
    try {
      const p = await api.createPlace(newPlaceName.trim(), newPlaceKind, userCoords.lat, userCoords.lng);
      setSelectedPlaceId(p.id);
      setShowAddPlace(false);
      setNewPlaceName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create place');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlaceId) {
      setError('Please select a destination');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.postTrip({
        placeId: selectedPlaceId,
        lat: userCoords.lat,
        lng: userCoords.lng,
        minutes,
        seats,
        openToAll: isNight && isFemale ? openToAll : true,
      });
      onTripCreated(res);
    } catch (err: any) {
      if (err.message === 'already_have_live_trip') {
        setError('You already have an active live trip.');
      } else if (err.status === 429) {
        setError('Please wait a few seconds before creating another ride.');
      } else {
        setError(err.message || 'Could not post ride.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-drag-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#FFF' }}>Going Now</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pins meeting point to your current location</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', padding: '6px', color: '#FFF' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.82rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {/* Saved Place Chips (Tap 1) */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Where are you going?
            </span>
            <button
              onClick={() => setShowAddPlace(!showAddPlace)}
              style={{ background: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Add Place
            </button>
          </div>

          {showAddPlace && (
            <div className="glass-card" style={{ padding: '12px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <input
                type="text"
                placeholder="Place name (e.g. My Society Gate)"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: '8px', color: '#FFF', fontSize: '0.85rem', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <select
                  value={newPlaceKind}
                  onChange={(e) => setNewPlaceKind(e.target.value as any)}
                  style={{ background: '#1A2234', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  <option value="society">Society</option>
                  <option value="mall">Mall</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={handleCreateNewPlace} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Quick Saved Place Horizontal Scroll */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
            {savedPlaces.map((p) => {
              const isSelected = selectedPlaceId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlaceId(p.id)}
                  className={`quick-chip ${isSelected ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSelected && <Check size={14} />}
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar for all other places */}
          <div style={{ position: 'relative', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Or search stations, malls, societies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 14px',
                borderRadius: '12px',
                color: '#FFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            {searchResults.length > 0 && (
              <div
                className="glass-card"
                style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 20,
                  background: '#151C2C',
                  padding: '6px',
                }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPlaceId(p.id);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: selectedPlaceId === p.id ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#FFF' }}>{p.name}</span>
                    <span className={`badge badge-${p.kind}`}>{p.kind}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leaving In (Tap 2) */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Leaving in
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {([5, 10, 15] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`quick-chip ${minutes === m ? 'selected' : ''}`}
                style={{ textAlign: 'center', padding: '12px', fontSize: '0.9rem' }}
              >
                {m} mins
              </button>
            ))}
          </div>
        </div>

        {/* Seats Wanted (Tap 3) */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Seats to share (excluding you)
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {([1, 2, 3] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeats(s)}
                className={`quick-chip ${seats === s ? 'selected' : ''}`}
                style={{ textAlign: 'center', padding: '12px', fontSize: '0.9rem' }}
              >
                {s} {s === 1 ? 'seat' : 'seats'}
              </button>
            ))}
          </div>
        </div>

        {/* Night Women-Only Rule Indicator */}
        {isNight && isFemale && (
          <div style={{ padding: '14px', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#EC4899" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#F472B6' }}>Night Safety: Women-Only</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={openToAll}
                  onChange={(e) => setOpenToAll(e.target.checked)}
                />
                <span style={{ color: 'var(--text-muted)' }}>Open to all</span>
              </label>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {openToAll ? 'Trip will be visible to everyone.' : 'Default: Only verified female riders get pinged & can join.'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedPlaceId}
          className="btn-primary"
          style={{ width: '100%', padding: '16px' }}
        >
          {loading ? 'Posting ride...' : 'Post Ride & Ping Nearby (Going Now)'}
        </button>
      </div>
    </div>
  );
};
