import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id: propertyId } = await params;

  try {
    const body = await request.json();
    const { orderList } = body; // Array of { id: string, sort_order: number }

    if (!orderList || !Array.isArray(orderList)) {
      return NextResponse.json({ success: false, message: 'Định dạng dữ liệu không hợp lệ!' }, { status: 400 });
    }

    // Run updates in transaction
    await prisma.$transaction(
      orderList.map((item: any) =>
        prisma.propertyMedia.update({
          where: { id: item.id, propertyId },
          data: { sortOrder: item.sort_order }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thứ tự sắp xếp ảnh thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
