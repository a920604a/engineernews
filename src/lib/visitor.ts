const OWNER_ID = 'owner-yuan3509';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  return OWNER_ID;
}
