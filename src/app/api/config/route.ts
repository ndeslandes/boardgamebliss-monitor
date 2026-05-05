import { NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/config';

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (typeof body.bggCookie === 'string') {
    setConfig({ bggCookie: body.bggCookie.trim() });
  }
  return NextResponse.json(getConfig());
}
