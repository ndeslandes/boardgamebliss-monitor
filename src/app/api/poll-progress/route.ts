import { NextResponse } from 'next/server';
import { getProgress } from '@/lib/progress';

export async function GET() {
  return NextResponse.json(getProgress());
}
