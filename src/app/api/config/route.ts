import { NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/config';

export async function GET() {
  const cfg = getConfig();
  return NextResponse.json({
    bggUsername: cfg.bggUsername ?? '',
    hasPassword: !!cfg.bggPassword,
    hasSession: !!(cfg.bggSessionId && cfg.bggSessionExpiry && new Date(cfg.bggSessionExpiry) > new Date()),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const patch: Parameters<typeof setConfig>[0] = {};
  if (typeof body.bggUsername === 'string') patch.bggUsername = body.bggUsername.trim();
  if (typeof body.bggPassword === 'string') patch.bggPassword = body.bggPassword;
  // clear cached session when credentials change
  if (patch.bggUsername !== undefined || patch.bggPassword !== undefined) {
    patch.bggSessionId = undefined;
    patch.bggSessionExpiry = undefined;
  }
  setConfig(patch);
  const cfg = getConfig();
  return NextResponse.json({
    bggUsername: cfg.bggUsername ?? '',
    hasPassword: !!cfg.bggPassword,
    hasSession: false,
  });
}
