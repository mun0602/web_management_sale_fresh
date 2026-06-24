import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: {
      netRevenue: 154800000,
      grossRevenue: 184800000,
      mrr: 45000000,
      refund: 30000000,
      activeUsers: 1250,
      trialUsers: 340,
      activeSubscriptions: 890,
      arpu: 50560
    }
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
