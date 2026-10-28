export interface Photo {
  id: string;
  filePath: string;
  thumbnailUrl?: string;
  mediaType?: 'image' | 'video';
  duration?: string;
  caption: string;
  month: string;
  year: number;
  dateStr?: string;
  location?: string;
  tags: string[];
  createdAt?: number; // unix epoch seconds (upload timestamp)
}

export interface TimelineImage {
  url: string;
  mediaType?: 'image' | 'video';
  caption?: string;
  location?: string;
}

export interface TimelineEvent {
  id: string;
  // ponytail: kind separates monthly recaps ('month') from specific-day
  // events like a birthday or anniversary ('event'). The same anchor
  // space (monthAnchor) groups them by month; events carry an extra
  // eventAnchor so the server-side carousel bucket can key per-event
  // without colliding with the month's carousel.
  kind: 'month' | 'event';
  month: string;
  year: number;
  monthAnchor: string; // e.g. "mes-febrero-2026"
  eventAnchor?: string; // e.g. "event-cumple-demo-2026" — required when kind === 'event'
  title: string;
  subtitle?: string;
  tone?: 'nostalgico' | 'humor' | 'romantico';
  text: string;
  internalJoke?: string;
  imageId?: string;
  images?: TimelineImage[];
  date: string;
  tags: string[];
  isBirthdayPlaceholder?: boolean; // @deprecated — use kind === 'event' instead. Kept for legacy reads during migration.
  isCustom?: boolean;
}

export interface LetterDrop {
  id: string;
  title: string;
  date: string;
  tagline?: string;
  content: string;
  author: string;
  isNewDrop?: boolean;
  waxSealColor?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  filePath: string;
  durationSec?: number;
  createdAt?: number;
}

export interface SiteMeta {
  siteTitle: string;
  subtitle: string;
  herName: string;
  hisName: string;
  nickname: string;
  accentColorHex: string;
  authorName: string;
  anniversaryDate: string;
  anniversaryCelebrationDate: string;
}

export interface TimeElapsed {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}
