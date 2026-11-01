import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Clock, Users, ArrowLeft, Send, Flag, ShieldAlert, AlertCircle, LogOut } from 'lucide-react';

interface TripScreenProps {
  tripId: string;
  user: any;
  onBack: () => void;
  onTripEnded: () => void;
}

export const TripScreen: React.FC<TripScreenProps> = ({
  tripId,
  user,
  onBack,
  onTripEnded,
}) => {
  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmFlagId, setConfirmFlagId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTripDetails = async () => {
    try {
      const data = await api.getTrip(tripId);
      setTrip(data.trip);
      setMembers(data.members || []);
      setMessages(data.messages || []);
      setChatOpen(data.chatOpen);
    } catch (err: any) {
      if (err.message === 'not_a_member') {
        onTripEnded();
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTripDetails();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [tripId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string, kind: 'text' | 'quick' = 'text') => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMessage(tripId, text.trim(), kind);
      setMessageText('');
      await fetchTripDetails();
    } catch (err: any) {
      if (err.status === 429) {
        setError('Please wait a moment before sending another message.');
      } else if (err.message === 'chat_closed') {
        setError('This ride has ended. Chat is closed.');
      } else {
        setError('Failed to send message.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleFlagMessage = async (messageId: string) => {
    try {
      await api.flagMessage(messageId);
      setConfirmFlagId(null);
      await fetchTripDetails();
    } catch (err: any) {
      setError(err.message || 'Could not flag message');
    }
  };

  const handleLeaveTrip = async () => {
    if (!window.confirm('Are you sure you want to leave this ride?')) return;
    try {
      await api.leaveTrip(tripId);
      onTripEnded();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading ride room...
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Ride not found or you are not a member.</p>
        <button onClick={onBack} className="btn-secondary" style={{ margin: '0 auto' }}>Go Back</button>
      </div>
    );
  }

  // Calculate remaining countdown
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsToLeave = Math.max(0, trip.leave_at - nowSec);
  const secondsToExpiry = Math.max(0, trip.expires_at - nowSec);

  const formatMinSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isPoster = members.some((m) => m.id === user.id && m.role === 'poster');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
      {/* Top Header Bar */}
      <div className="app-header" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={{ background: 'none', color: '#FFF', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#FFF' }}>{trip.place}</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Ride Room • {members.length} Rider{members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={handleLeaveTrip}
          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-full)', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <LogOut size={13} />
          {isPoster ? 'Cancel Ride' : 'Leave'}
        </button>
      </div>

      {/* Trip Status & Countdown Pill */}
      <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#FF6B00" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {secondsToLeave > 0 ? (
                <>Leaving in <span style={{ color: '#FF7A00' }}>{formatMinSec(secondsToLeave)}</span></>
              ) : secondsToExpiry > 0 ? (
                <>No-show wait: <span style={{ color: '#F59E0B' }}>{formatMinSec(secondsToExpiry)}</span></>
              ) : (
                <span style={{ color: '#EF4444' }}>Ride Expired</span>
              )}
            </span>
          </div>
          <span className={`badge ${trip.status === 'open' ? 'badge-society' : trip.status === 'full' ? 'badge-office' : 'badge-other'}`}>
            {trip.status.toUpperCase()}
          </span>
        </div>

        {/* Member First Names */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <Users size={14} color="var(--text-dim)" />
          {members.map((m) => (
            <span
              key={m.id}
              style={{
                fontSize: '0.78rem',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: m.id === user.id ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: m.id === user.id ? '#FFA552' : '#FFF',
                border: m.id === user.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                fontWeight: 600,
              }}
            >
              {m.first_name} {m.role === 'poster' ? '👑' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Safety & No-Show Reminders */}
      <div style={{ padding: '8px 16px', background: 'rgba(255, 107, 0, 0.06)', borderBottom: '1px solid rgba(255, 107, 0, 0.15)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <AlertCircle size={15} color="#FF7A00" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
          <strong>Meeting Rule:</strong> Wait at the meeting spot until countdown ends, agree the fare with the driver, then split equally among whoever shows up.
        </div>
      </div>

      {error && (
        <div style={{ margin: '8px 16px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', borderRadius: '8px', fontSize: '0.78rem' }}>
          {error}
        </div>
      )}

      {/* Chat Messages Scrollable Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '30px' }}>
            No messages yet. Use quick buttons below to say you arrived!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user.id;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '3px', paddingLeft: '4px' }}>
                  {isMe ? 'You' : msg.first_name}
                </div>
                <div
                  style={{
                    background: isMe ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.07)',
                    color: isMe ? '#FFFFFF' : 'var(--text-main)',
                    padding: '10px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '0.88rem',
                    lineHeight: '1.35',
                    wordBreak: 'break-word',
                    border: isMe ? 'none' : '1px solid var(--border-subtle)',
                    position: 'relative',
                  }}
                >
                  {msg.body}
                </div>

                {/* Flag & Report button for other members' messages */}
                {!isMe && (
                  <button
                    onClick={() => setConfirmFlagId(msg.id)}
                    style={{ background: 'none', color: 'var(--text-dim)', fontSize: '0.68rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Flag size={11} /> Flag
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Flag Confirmation Dialog */}
      {confirmFlagId && (
        <div className="sheet-overlay" style={{ alignItems: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '380px', width: '100%', padding: '20px', background: '#141824' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', marginBottom: '8px' }}>
              <ShieldAlert size={20} />
              <h4 style={{ fontSize: '1.05rem', color: '#FFF' }}>Flag & Report Message</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Flagging immediately removes this user from the ride, frees their seat, and keeps surrounding messages as evidence for review.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmFlagId(null)} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>
                Cancel
              </button>
              <button onClick={() => handleFlagMessage(confirmFlagId)} className="btn-danger" style={{ flex: 1, padding: '10px' }}>
                Confirm Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons (Section 5.7) */}
      {chatOpen && (
        <div style={{ padding: '6px 16px 0', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {(["I'm here", "2 min late", "Leaving now", "Can't make it"] as const).map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q, 'quick')}
              className="quick-chip"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <div style={{ padding: '12px 16px max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border-subtle)', background: '#0D111D' }}>
        {chatOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(messageText, 'text');
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="Message group (first names only)..."
              value={messageText}
              maxLength={500}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-full)',
                color: '#FFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="btn-primary"
              style={{ padding: '10px 16px', borderRadius: 'var(--radius-full)' }}
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            Ride ended. Chat is in 1-hour read-only mode for reports.
          </div>
        )}
      </div>
    </div>
  );
};
