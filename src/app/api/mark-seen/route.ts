import { NextResponse } from 'next/server';
import { markAllSeen } from '@/lib/db';
import { STORES } from '@/lib/stores';

export async function POST() {
  STORES.forEach(s => markAllSeen(s.id));
  return NextResponse.json({ ok: true });
}
