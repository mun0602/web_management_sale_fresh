import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    // 1. Get properties
    const properties = await prisma.property.findMany({
      where: {
        ownerUserId: session.sub,
        deletedAt: null
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: 1000
    });

    const propIds = properties.map(p => p.id);

    // Map owner_user_id to 1 (integer) for Android SQLite compatibility
    const mappedProperties = properties.map((p: any) => {
      return {
        ...p,
        owner_user_id: 1
      };
    });

    // 2. Get media
    let media: any[] = [];
    let groupMembers: any[] = [];

    if (propIds.length > 0) {
      media = await prisma.propertyMedia.findMany({
        where: {
          propertyId: { in: propIds }
        },
        orderBy: { sortOrder: 'asc' }
      });

      const members = await prisma.propertyGroupMember.findMany({
        where: {
          propertyId: { in: propIds }
        }
      });
      
      // Map schema fields to Go structure fields
      groupMembers = members.map(m => ({
        property_id: m.propertyId,
        group_id: m.groupId
      }));
    }

    return NextResponse.json({
      success: true,
      properties: serializeBigInt(mappedProperties),
      media: serializeBigInt(media),
      group_members: groupMembers
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
