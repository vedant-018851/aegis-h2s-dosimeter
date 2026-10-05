import type { ExposureCategory, ExpiryStatus } from '../types';
import type { StatusTone } from '../components/common/StatusPill';

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatRelativeShort(ts: number): string {
  const diffMs = Date.now() - ts;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function exposureCategoryLabel(category: ExposureCategory): string {
  switch (category) {
    case 'low':
      return 'LOW';
    case 'moderate':
      return 'MODERATE';
    case 'high':
      return 'HIGH';
    case 'review_required':
      return 'REVIEW REQUIRED';
  }
}

export function exposureCategoryTone(category: ExposureCategory): StatusTone {
  switch (category) {
    case 'low':
      return 'good';
    case 'moderate':
      return 'warn';
    case 'high':
      return 'bad';
    case 'review_required':
      return 'neutral';
  }
}

export function confidenceTone(label: 'LOW' | 'MEDIUM' | 'HIGH'): StatusTone {
  if (label === 'HIGH') return 'good';
  if (label === 'MEDIUM') return 'warn';
  return 'bad';
}

export function expiryLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'valid':
      return 'VALID';
    case 'expiring_soon':
      return 'EXPIRING SOON';
    case 'expired':
      return 'EXPIRED';
    case 'unreadable':
      return 'UNREADABLE';
  }
}

export function expiryTone(status: ExpiryStatus): StatusTone {
  switch (status) {
    case 'valid':
      return 'good';
    case 'expiring_soon':
      return 'warn';
    case 'expired':
      return 'bad';
    case 'unreadable':
      return 'neutral';
  }
}

export function integrityTone(score: number): StatusTone {
  if (score >= 80) return 'good';
  if (score >= 55) return 'warn';
  return 'bad';
}
