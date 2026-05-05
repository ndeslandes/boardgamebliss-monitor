import { getConfig, setConfig } from './config';

const LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function login(username: string, password: string): Promise<string | null> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept': 'application/json' },
    body: JSON.stringify({ credentials: { username, password } }),
  });
  if (!res.ok) return null;
  const cookie = res.headers.get('set-cookie') ?? '';
  const m = cookie.match(/SessionID=([^;]+)/);
  return m ? m[1] : null;
}

// Returns a Cookie header value like "SessionID=abc123", or null if no credentials configured.
// Caches the session for 50 minutes (BGG session lifetime is 60 min).
export async function getBggSessionCookie(): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg.bggUsername || !cfg.bggPassword) return null;

  if (cfg.bggSessionId && cfg.bggSessionExpiry) {
    if (new Date(cfg.bggSessionExpiry) > new Date(Date.now() + 60_000)) {
      return `SessionID=${cfg.bggSessionId}`;
    }
  }

  const sessionId = await login(cfg.bggUsername, cfg.bggPassword);
  if (!sessionId) return null;

  setConfig({
    bggSessionId: sessionId,
    bggSessionExpiry: new Date(Date.now() + 50 * 60_000).toISOString(),
  });
  return `SessionID=${sessionId}`;
}
