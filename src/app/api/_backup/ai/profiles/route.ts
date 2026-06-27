import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const profiles = await prisma.contentProfile.findMany({
      where: { ownerUserId: session.sub },
      include: { samples: true },
      orderBy: { createdAt: 'desc' }
    });

    const mappedProfiles = profiles.map(p => ({
      id: p.id,
      owner_user_id: p.ownerUserId,
      name: p.name,
      relationship: p.relationship,
      length: p.length,
      emoji_level: p.emojiLevel,
      default_cta: p.defaultCta,
      default_hashtags: p.defaultHashtags,
      forbidden_words: p.forbiddenWords,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      samples: p.samples.map(s => s.sampleText)
    }));

    return NextResponse.json({
      success: true,
      profiles: mappedProfiles
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
    const { name, relationship, length, emoji_level, default_cta, default_hashtags, forbidden_words, samples } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Thiếu tên phong cách!' }, { status: 400 });
    }

    const id = `profile_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await prisma.contentProfile.create({
      data: {
        id,
        ownerUserId: session.sub,
        name,
        relationship: relationship || 'Em - Anh/Chị',
        length: length || 'trung bình',
        emojiLevel: emoji_level || 'vừa phải',
        defaultCta: default_cta || null,
        defaultHashtags: default_hashtags || null,
        forbiddenWords: forbidden_words || null
      }
    });

    if (samples && Array.isArray(samples) && samples.length > 0) {
      await prisma.contentProfileSample.createMany({
        data: samples.map((text: string) => ({
          id: `sample_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          profileId: id,
          sampleText: text
        }))
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Tạo phong cách AI thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
