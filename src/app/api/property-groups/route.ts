import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const groups = await prisma.propertyGroup.findMany({
      where: { ownerUserId: session.sub },
      orderBy: { sortOrder: 'asc' }
    });

    // Format fields to snake_case matching Go PropertyGroup struct
    const mappedGroups = groups.map(g => ({
      id: g.id,
      owner_user_id: g.ownerUserId,
      name: g.name,
      group_type: g.groupType,
      filter_json: g.filterJson,
      sort_order: g.sortOrder,
      created_at: g.createdAt.toISOString(),
      updated_at: g.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      groups: serializeBigInt(mappedGroups)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, group_type, filter_json } = body;

    if (!name || !group_type) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    const id = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const count = await prisma.propertyGroup.count({
      where: { ownerUserId: session.sub }
    });

    await prisma.propertyGroup.create({
      data: {
        id,
        ownerUserId: session.sub,
        name,
        groupType: group_type,
        filterJson: filter_json || null,
        sortOrder: count + 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Tạo nhóm căn hộ thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
