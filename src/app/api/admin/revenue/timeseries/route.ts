import { NextResponse } from 'next/server';

export async function GET() {
  const mockData = [
    { name: '25/05', revenue: 5000000 },
    { name: '28/05', revenue: 8000000 },
    { name: '31/05', revenue: 4000000 },
    { name: '03/06', revenue: 12000000 },
    { name: '06/06', revenue: 9000000 },
    { name: '09/06', revenue: 15000000 },
    { name: '12/06', revenue: 11000000 },
    { name: '15/06', revenue: 18000000 },
    { name: '18/06', revenue: 14000000 },
    { name: '21/06', revenue: 22000000 },
    { name: '25/06', revenue: 25000000 }
  ];

  return NextResponse.json({
    data: mockData
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
