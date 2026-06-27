import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { propertyId } = await params;

  try {
    const drafts = await prisma.contentDraft.findMany({
      where: {
        propertyId,
        ownerUserId: session.sub
      },
      include: {
        profile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mappedDrafts = drafts.map(d => ({
      id: d.id,
      owner_user_id: d.ownerUserId,
      property_id: d.propertyId,
      profile_id: d.profileId,
      channel: d.channel,
      purpose: d.purpose,
      prompt_metadata: d.promptMetadata,
      output_text: d.outputText,
      status: d.status,
      created_at: d.createdAt.toISOString(),
      profile_name: d.profile.name
    }));

    return NextResponse.json({
      success: true,
      drafts: mappedDrafts
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
