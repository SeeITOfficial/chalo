import { TUNABLES } from './config.js';

export const IST_OFFSET_SECONDS = 19800; // 5h 30m in seconds (UTC+5:30)
export const now = () => Math.floor(Date.now() / 1000);
export const dayNo = (t = now()) => Math.floor((t + IST_OFFSET_SECONDS) / 86400);

export const isNight = (t = now()): boolean => {
  // IST hours: 0-23
  const istSecondsInDay = ((t + IST_OFFSET_SECONDS) % 86400 + 86400) % 86400;
  const hour = Math.floor(istSecondsInDay / 3600);
  return hour >= TUNABLES.NIGHT_START_HOUR || hour < TUNABLES.NIGHT_END_HOUR;
};

export function uuidv7(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let t = Date.now();
  for (let i = 5; i >= 0; i--) {
    b[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70; // version 7
  b[8] = (b[8] & 0x3f) | 0x80; // variant 1
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function distM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function box(lat: number, meters: number) {
  return {
    dLat: meters / 111320,
    dLng: meters / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180))),
  };
}

export const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
export const validLoc = (lat: unknown, lng: unknown): boolean =>
  isNum(lat) && isNum(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
