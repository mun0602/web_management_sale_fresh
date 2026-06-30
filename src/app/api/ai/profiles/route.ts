import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    // Danh sách 3 phong cách mặc định cần đảm bảo luôn tồn tại
    const DEFAULT_NAMES = [
      "Trang trọng & Chuyên nghiệp",
      "Gần gũi & Cảm xúc",
      "Thu hút & Đánh mạnh ưu điểm"
    ];

    // Kiểm tra từng phong cách mặc định có tồn tại chưa
    const existing = await prisma.contentProfile.findMany({
      where: {
        ownerUserId: session.sub,
        name: { in: DEFAULT_NAMES }
      },
      select: { name: true }
    });

    const existingNames = new Set(existing.map(p => p.name));
    const nowMs = Date.now();

    const toSeed = [
      {
        id: `profile_def1_${nowMs}`,
        ownerUserId: session.sub,
        name: "Trang trọng & Chuyên nghiệp",
        relationship: "Chuyên viên tư vấn BĐS cao cấp",
        length: "ngắn (dưới 10 dòng)",
        emojiLevel: "ít",
        defaultCta: "Liên hệ ngay để xem nhà thực tế.",
        defaultHashtags: "#batdongsan #chuyennghiep",
        forbiddenWords: ""
      },
      {
        id: `profile_def2_${nowMs + 1}`,
        ownerUserId: session.sub,
        name: "Gần gũi & Cảm xúc",
        relationship: "Người chia sẻ tổ ấm gia đình",
        length: "ngắn (dưới 8 dòng)",
        emojiLevel: "vừa phải",
        defaultCta: "Hãy đến và cảm nhận ngôi nhà mơ ước của bạn.",
        defaultHashtags: "#toam #giadinh",
        forbiddenWords: ""
      },
      {
        id: `profile_def3_${nowMs + 2}`,
        ownerUserId: session.sub,
        name: "Thu hút & Đánh mạnh ưu điểm",
        relationship: "Chuyên gia săn sale BĐS giá tốt",
        length: "rất ngắn (dưới 6 dòng)",
        emojiLevel: "nhiều",
        defaultCta: "Chốt ngay kẻo lỡ! Giá quá tốt!",
        defaultHashtags: "#bdsgiatot #sansale",
        forbiddenWords: ""
      }
    ].filter(p => !existingNames.has(p.name));

    if (toSeed.length > 0) {
      await prisma.contentProfile.createMany({ data: toSeed });
    }

    const profiles = await prisma.contentProfile.findMany({
      where: { ownerUserId: session.sub },
      include: { samples: true },
      orderBy: { createdAt: 'asc' }
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
