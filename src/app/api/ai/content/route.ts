import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import axios from 'axios';
import redis from '@/lib/redis';

async function checkAndIncrAIQuota(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: userId,
      status: 'active',
      endDate: { gt: new Date() }
    },
    include: {
      plan: true
    }
  });

  let limit = 5;
  let isUnlimited = false;

  if (subscriptions && subscriptions.length > 0) {
    let baseLimit = 5;
    let addonLimit = 0;

    for (const sub of subscriptions) {
      const features = sub.plan.features || '';
      if (features.includes('ai_unlimited')) {
        isUnlimited = true;
        limit = -1;
        break;
      }

      const parts = features.split(',');
      for (let f of parts) {
        f = f.trim();
        if (f.startsWith('ai_limit:')) {
          const l = parseInt(f.substring('ai_limit:'.length), 10);
          if (!isNaN(l) && l > baseLimit) {
            baseLimit = l;
          }
        }
        if (f.startsWith('ai_addon:')) {
          const a = parseInt(f.substring('ai_addon:'.length), 10);
          if (!isNaN(a)) {
            addonLimit += a;
          }
        }
      }
    }

    if (!isUnlimited) {
      limit = baseLimit + addonLimit;
    }
  }

  if (isUnlimited) {
    return { allowed: true, limit: -1, current: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const redisKey = `user:ai_quota:${userId}:${today}`;

  const currentStr = await redis.get(redisKey);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= limit) {
    return { allowed: false, limit, current };
  }

  const newVal = await redis.incr(redisKey);
  if (newVal === 1) {
    await redis.expire(redisKey, 24 * 60 * 60);
  }

  return { allowed: true, limit, current: newVal };
}

async function callAI(prompt: string): Promise<string> {
  let apiURL = process.env.AI_API_URL || 'https://vps.mun-ai.art/v1';
  if (!apiURL.endsWith('/chat/completions')) {
    apiURL = apiURL.endsWith('/') ? `${apiURL}chat/completions` : `${apiURL}/chat/completions`;
  }

  const apiKey = process.env.AI_API_KEY || 'sk-77056df5cbf6399d-iadki5-d3d0f1f5';
  const model = process.env.AI_MODEL || 'minimax/MiniMax-M3';

  const minimaxPayload = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Bạn là chuyên gia marketing bất động sản. Hãy viết bài quảng cáo hấp dẫn, chuyên nghiệp bằng tiếng Việt dựa trên thông tin được cung cấp.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: false
  };

  const response = await axios.post(apiURL, minimaxPayload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  });

  let aiOutput = response.data.choices[0].message.content || '';
  aiOutput = aiOutput.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();

  return aiOutput;
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') === 'true';

  try {
    const quota = await checkAndIncrAIQuota(session.sub);
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        message: `Bạn đã vượt quá hạn mức sử dụng AI hàng ngày (${quota.limit} lượt/ngày) của gói cước hiện tại. Vui lòng nâng cấp gói cước để tiếp tục sử dụng!`
      }, { status: 403 });
    }

    const body = await request.json();
    const propertyId = body.propertyId || body.property_id;
    const profileId = body.profileId || body.profile_id;
    const channel = body.channel || 'facebook';
    const purpose = body.purpose || 'post';
    const customInstruction = body.customInstruction || '';

    if (!propertyId || !profileId) {
      return NextResponse.json({ success: false, message: 'Thiếu propertyId hoặc profileId!' }, { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerUserId: session.sub, deletedAt: null }
    });

    const profile = await prisma.contentProfile.findFirst({
      where: { id: profileId, ownerUserId: session.sub }
    });

    if (!property || !profile) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ hoặc phong cách viết!' }, { status: 404 });
    }

    let xung = 'Em';
    let khach = 'Anh/Chị';
    const relParts = (profile.relationship || '').split(' - ');
    if (relParts.length === 2) {
      xung = relParts[0];
      khach = relParts[1];
    }

    const priceLabel = property.priceLabel || '';
    const area = property.areaM2 ? `${property.areaM2} m²` : 'Chưa cập nhật';
    const bed = property.bedrooms || 0;
    const bath = property.bathrooms || 0;
    const legal = property.legalStatus || 'Sổ hồng lâu dài, pháp lý rõ ràng';

    let prompt = `Hãy viết một bài viết giới thiệu bất động sản cực kỳ cuốn hút dựa trên thông tin sau:
- Mã căn: ${property.propertyCode}
- Tiêu đề: ${property.title}
- Mô tả hiện tại: ${property.description}
- Vị trí: ${property.addressText || ''}, ${property.district || ''}, ${property.province || ''}
- Giá bán: ${priceLabel}
- Diện tích: ${area}
- Thiết kế: ${bed} phòng ngủ, ${bath} phòng tắm
- Pháp lý: ${legal}

Yêu cầu phong cách viết bài:
- Cách xưng hô: Người viết xưng là "${xung}" và gọi khách hàng là "${khach}".
- Độ dài bài viết: ${profile.length}.
- Mức độ sử dụng Emoji: ${profile.emojiLevel}.
- Lời kêu gọi hành động cuối bài (CTA): ${profile.defaultCta || ''}.
- Danh sách Hashtags đi kèm: ${profile.defaultHashtags || ''}.
`;

    if (customInstruction) {
      prompt += `- Yêu cầu bổ sung đặc biệt từ người dùng: ${customInstruction}\n`;
    }
    if (profile.forbiddenWords) {
      prompt += `- TUYỆT ĐỐI KHÔNG sử dụng các từ ngữ sau: ${profile.forbiddenWords}\n`;
    }

    if (stream) {
      const encoder = new TextEncoder();
      
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            const aiText = await callAI(prompt);
            
            // Save draft
            const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await prisma.contentDraft.create({
              data: {
                id: draftId,
                ownerUserId: session.sub,
                propertyId,
                profileId,
                channel,
                purpose,
                promptMetadata: JSON.stringify({ channel, purpose, customInstruction }),
                outputText: aiText,
                status: 'draft'
              }
            });

            // Simulate stream in chunks
            const chars = Array.from(aiText);
            const chunkSize = 8;
            for (let i = 0; i < chars.length; i += chunkSize) {
              const chunk = chars.slice(i, i + chunkSize).join('');
              const msg = JSON.stringify({ content: chunk });
              controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
              await new Promise(r => setTimeout(r, 15));
            }
            
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (e: any) {
            controller.enqueue(encoder.encode(`data: {"content": "Lỗi kết nối AI API: ${e.message}"}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        }
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    const aiText = await callAI(prompt);
    const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await prisma.contentDraft.create({
      data: {
        id: draftId,
        ownerUserId: session.sub,
        propertyId,
        profileId,
        channel,
        purpose,
        promptMetadata: JSON.stringify({ channel, purpose, customInstruction }),
        outputText: aiText,
        status: 'draft'
      }
    });

    return NextResponse.json({
      success: true,
      content: aiText,
      draftId,
      ai_limit: quota.limit,
      ai_usage: quota.current
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
