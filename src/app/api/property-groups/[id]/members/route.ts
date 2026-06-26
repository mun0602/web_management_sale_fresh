import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id: groupId } = await params;

  try {
    const group = await prisma.propertyGroup.findFirst({
      where: { id: groupId, ownerUserId: session.sub }
    });

    if (!group) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhóm căn hộ này!' }, { status: 404 });
    }

    if (group.groupType !== 'manual') {
      return NextResponse.json({ success: false, message: 'Không thể thêm thành viên thủ công vào nhóm động!' }, { status: 400 });
    }

    const body = await request.json();
    const { propertyIds } = body;

    if (!propertyIds || !Array.isArray(propertyIds)) {
      return NextResponse.json({ success: false, message: 'propertyIds không hợp lệ!' }, { status: 400 });
    }

    // Verify property ownership
    if (propertyIds.length > 0) {
      const validCount = await prisma.property.count({
        where: {
          id: { in: propertyIds },
          ownerUserId: session.sub,
          deletedAt: null
        }
      });
      if (validCount !== propertyIds.length) {
        return NextResponse.json({ success: false, message: 'Một số căn hộ không hợp lệ hoặc không thuộc sở hữu của bạn!' }, { status: 400 });
      }
    }

    // Update members
    await prisma.$transaction([
      prisma.propertyGroupMember.deleteMany({
        where: { groupId }
      }),
      prisma.propertyGroupMember.createMany({
        data: propertyIds.map(propId => ({
          propertyId: propId,
          groupId
        }))
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thành viên nhóm thành công!',
      count: propertyIds.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST support as fallback
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params });
}
