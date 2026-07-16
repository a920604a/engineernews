export const DAILY_LIMIT = 20;
const KEY = 'qa_daily_usage';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readUsage(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const { count, date } = JSON.parse(raw) as { count: number; date: string };
    return date === todayStr() ? count : 0;
  } catch {
    return 0;
  }
}

export function writeUsage(count: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify({ count, date: todayStr() }));
}

export function remaining(): number {
  return Math.max(0, DAILY_LIMIT - readUsage());
}

export function tryConsume(): { ok: boolean; used: number; remaining: number } {
  const current = readUsage();
  if (current >= DAILY_LIMIT) {
    return { ok: false, used: current, remaining: 0 };
  }
  const next = current + 1;
  writeUsage(next);
  return { ok: true, used: next, remaining: DAILY_LIMIT - next };
}
