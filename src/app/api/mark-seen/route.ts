import { NextResponse } from 'next/server';
import { markAllSeen } from '@/lib/db';

export async function POST() {
  markAllSeen();
  return NextResponse.json({ ok: true });
}
