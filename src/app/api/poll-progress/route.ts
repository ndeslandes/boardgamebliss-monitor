import { NextResponse } from 'next/server';
import { getAllProgress } from '@/lib/progress';

export async function GET() {
  return NextResponse.json(getAllProgress());
}
