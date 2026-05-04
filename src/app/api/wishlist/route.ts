import { NextResponse } from 'next/server';
import { getWishlist, toggleWishlist } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ wishlist: getWishlist() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const wishlisted = toggleWishlist(body);
  return NextResponse.json({ ok: true, wishlisted });
}
