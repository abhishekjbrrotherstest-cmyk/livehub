type Level = 'debug' | 'http' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, http: 20, info: 30, warn: 40, error: 50 };
const LEVEL_COLORS: Record<Level, string> = {
  debug: '\x1b[90m',
  http: '\x1b[35m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
};
const RESET = '\x1b[0m';

const configuredLevel = (process.env.LOG_LEVEL ?? 'info') as Level;

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= (LEVEL_ORDER[configuredLevel] ?? LEVEL_ORDER.info);
}

function write(level: Level, message: string): void {
  if (!shouldLog(level)) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  if (process.stdout.isTTY) {
    if (level === 'error') console.error(`${LEVEL_COLORS[level]}${line}${RESET}`);
    else console.log(`${LEVEL_COLORS[level]}${line}${RESET}`);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string) => write('debug', message),
  http: (message: string) => write('http', message),
  info: (message: string) => write('info', message),
  warn: (message: string) => write('warn', message),
  error: (message: string) => write('error', message),
  stream: {
    write: (message: string) => {
      write('http', message.trim());
      return true;
    }
  }
};
