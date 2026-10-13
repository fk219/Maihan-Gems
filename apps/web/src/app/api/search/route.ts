import { NextResponse } from 'next/server';

import { searchStorefront } from '../../../lib/storefront-data.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const limit = Number(searchParams.get('limit') ?? '12');
  const result = await searchStorefront(q, Number.isFinite(limit) ? limit : 12);
  return NextResponse.json({
    parsed: result.parsed,
    items: result.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      priceUsd: item.priceUsd,
      kind: item.kind,
      stoneType: item.stoneType,
      shape: item.shape,
    })),
  });
}
