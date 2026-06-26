import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const existing = await prisma.propertyGroup.findFirst({
      where: { id, ownerUserId: session.sub }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhóm căn hộ này!' }, { status: 404 });
    }

    const body = await request.json();
    const { name, filter_json } = body;

    await prisma.propertyGroup.update({
      where: { id },
      data: {
        name: name || existing.name,
        filterJson: filter_json !== undefined ? filter_json : existing.filterJson
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật nhóm thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const existing = await prisma.propertyGroup.findFirst({
      where: { id, ownerUserId: session.sub }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhóm căn hộ này!' }, { status: 404 });
    }

    await prisma.propertyGroup.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa nhóm thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
