export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * createLogger — writes to D1 `logs` table AND forwards to console.
 * Always fire-and-forget; never throws.
 *
 * Usage:
 *   const log = createLogger(env.DB, 'api/search');
 *   log.info('embedding ok', { dims: 1024 });
 *   log.error('vectorize failed', err);
 */
export function createLogger(db: D1Database, source: string) {
  function write(level: LogLevel, message: string, extra?: unknown) {
    // Always mirror to console so wrangler tail / CF dashboard still works
    const consoleMethod = level === 'debug' ? console.debug
      : level === 'info'  ? console.info
      : level === 'warn'  ? console.warn
      : console.error;

    if (extra !== undefined) {
      consoleMethod(`[${source}]`, message, extra);
    } else {
      consoleMethod(`[${source}]`, message);
    }

    // Persist async, never block the response
    const dataStr = extra !== undefined
      ? (typeof extra === 'string' ? extra : JSON.stringify(extra, null, 0))
      : null;

    void db
      .prepare('INSERT INTO logs (level, source, message, data) VALUES (?, ?, ?, ?)')
      .bind(level, source, message, dataStr)
      .run()
      .catch(() => { /* non-critical */ });
  }

  return {
    debug: (msg: string, extra?: unknown) => write('debug', msg, extra),
    info:  (msg: string, extra?: unknown) => write('info',  msg, extra),
    warn:  (msg: string, extra?: unknown) => write('warn',  msg, extra),
    error: (msg: string, extra?: unknown) => write('error', msg, extra),
  };
}

export type Logger = ReturnType<typeof createLogger>;
