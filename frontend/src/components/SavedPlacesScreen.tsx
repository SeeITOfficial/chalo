import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Bookmark, Trash2, Plus, Search, MapPin, Check } from 'lucide-react';

interface SavedPlacesScreenProps {
  onPlaceSavedChange: () => void;
}

export const SavedPlacesScreen: React.FC<SavedPlacesScreenProps> = ({ onPlaceSavedChange }) => {
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPlaces = async () => {
    try {
      const data = await api.getSavedPlaces();
      setSavedPlaces(data.places || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPlaces();
  }, []);

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

  const handleSavePlace = async (placeId: string) => {
    try {
      await api.savePlace(placeId);
      await fetchSavedPlaces();
      onPlaceSavedChange();
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSavedPlace = async (placeId: string) => {
    try {
      await api.deleteSavedPlace(placeId);
      await fetchSavedPlaces();
      onPlaceSavedChange();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#FFF', marginBottom: '4px' }}>Saved Places</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
          When you turn on <strong>"I'm around"</strong>, you only get pinged for trips going to your saved places.
        </p>
      </div>

      {/* Search & Add Destination */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '10px 14px', gap: '8px' }}>
          <Search size={18} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search stations, societies, DMarts to save..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem' }}
          />
        </div>

        {/* Dropdown Results */}
        {searchResults.length > 0 && (
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              right: 0,
              zIndex: 30,
              background: '#151C2C',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '6px',
            }}
          >
            {searchResults.map((p) => {
              const isAlreadySaved = savedPlaces.some((sp) => sp.id === p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', color: '#FFF', fontWeight: 600 }}>{p.name}</div>
                    <span className={`badge badge-${p.kind}`} style={{ fontSize: '0.65rem' }}>{p.kind}</span>
                  </div>
                  {isAlreadySaved ? (
                    <span style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Saved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSavePlace(p.id)}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <Plus size={13} /> Save
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Places List */}
      <h3 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        My Destination Shortcuts ({savedPlaces.length})
      </h3>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Loading shortcuts...</div>
      ) : savedPlaces.length === 0 ? (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Bookmark size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ fontSize: '0.85rem' }}>No saved places yet.</p>
          <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Search above to add railway station, airport, or your society gate.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {savedPlaces.map((place) => (
            <div
              key={place.id}
              className="glass-card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 107, 0, 0.12)', color: 'var(--accent-primary)', padding: '8px', borderRadius: '10px' }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFF' }}>{place.name}</div>
                  <span className={`badge badge-${place.kind}`} style={{ fontSize: '0.68rem', marginTop: '3px' }}>
                    {place.kind}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteSavedPlace(place.id)}
                style={{ background: 'none', color: 'var(--text-dim)', padding: '8px' }}
                title="Remove saved place"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
