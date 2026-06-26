import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const existing = await prisma.contentProfile.findFirst({
      where: { id, ownerUserId: session.sub }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy phong cách viết AI này!' }, { status: 404 });
    }

    const body = await request.json();
    const { name, relationship, length, emoji_level, default_cta, default_hashtags, forbidden_words, samples } = body;

    await prisma.contentProfile.update({
      where: { id },
      data: {
        name: name || existing.name,
        relationship: relationship !== undefined ? relationship : existing.relationship,
        length: length !== undefined ? length : existing.length,
        emojiLevel: emoji_level !== undefined ? emoji_level : existing.emojiLevel,
        defaultCta: default_cta !== undefined ? default_cta : existing.defaultCta,
        defaultHashtags: default_hashtags !== undefined ? default_hashtags : existing.defaultHashtags,
        forbiddenWords: forbidden_words !== undefined ? forbidden_words : existing.forbiddenWords
      }
    });

    if (samples && Array.isArray(samples)) {
      await prisma.$transaction([
        prisma.contentProfileSample.deleteMany({ where: { profileId: id } }),
        prisma.contentProfileSample.createMany({
          data: samples.map((text: string) => ({
            id: `sample_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            profileId: id,
            sampleText: text
          }))
        })
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật phong cách AI thành công!'
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
    const existing = await prisma.contentProfile.findFirst({
      where: { id, ownerUserId: session.sub }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy phong cách viết AI này!' }, { status: 404 });
    }

    await prisma.contentProfile.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa phong cách AI thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
