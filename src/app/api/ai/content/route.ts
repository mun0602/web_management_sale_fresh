import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import axios from 'axios';
import { checkAndIncrAIQuota } from '@/lib/ai-quota';
import { generateRealEstateContent } from '@/lib/ai-provider';

async function callGoAI(prompt: string): Promise<string> {
  const GO_SERVER_URL = process.env.GO_SERVER_URL || 'http://localhost:8080';
  const url = `${GO_SERVER_URL}/api/ai/generate-content`;

  try {
    const response = await axios.post(url, { prompt }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120s
    });

    if (response.data && response.data.success) {
      return response.data.content;
    }
    throw new Error(response.data?.message || 'Lỗi không xác định từ Go AI service');
  } catch (err: any) {
    console.warn('[AI content] Go AI unavailable, falling back to direct provider:', err.message);
    return generateRealEstateContent(prompt);
  }
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') === 'true';

  try {
    const quota = await checkAndIncrAIQuota(session.sub, session.role);
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

    if (!profile) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy phong cách viết!' }, { status: 404 });
    }

    // Nếu property không có trên server (local-only), dùng thông tin từ request body
    const propData = property || {
      propertyCode: body.propertyCode || body.property_code || propertyId,
      title: body.title || 'Căn hộ',
      description: body.description || '',
      addressText: body.addressText || body.address_text || '',
      district: body.district || '',
      province: body.province || '',
      priceLabel: body.priceLabel || body.price_label || '',
      areaM2: body.areaM2 || body.area_m2 || null,
      bedrooms: body.bedrooms || 0,
      bathrooms: body.bathrooms || 0,
      legalStatus: body.legalStatus || body.legal_status || null,
    };

    let xung = 'Em';
    let khach = 'Anh/Chị';
    const relParts = (profile.relationship || '').split(' - ');
    if (relParts.length === 2) {
      xung = relParts[0];
      khach = relParts[1];
    }

    const priceLabel = propData.priceLabel || '';
    const area = propData.areaM2 ? `${propData.areaM2} m²` : 'Chưa cập nhật';
    const bed = propData.bedrooms || 0;
    const bath = propData.bathrooms || 0;
    const legal = propData.legalStatus || 'Sổ hồng lâu dài, pháp lý rõ ràng';

    let prompt = `Hãy viết một bài viết giới thiệu bất động sản cực kỳ cuốn hút dựa trên thông tin sau:
- Mã căn: ${propData.propertyCode}
- Tiêu đề: ${propData.title}
- Mô tả hiện tại: ${propData.description}
- Vị trí: ${propData.addressText || ''}, ${propData.district || ''}, ${propData.province || ''}
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
            const aiText = await callGoAI(prompt);
            
            // Save draft (bỏ qua lỗi nếu propertyId không tồn tại trên server)
            const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            try {
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
            } catch (draftErr) {
              console.warn('Draft save failed (property may be local-only):', draftErr);
            }

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

    const aiText = await callGoAI(prompt);
    const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    try {
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
    } catch (draftErr) {
      console.warn('Draft save failed (property may be local-only):', draftErr);
    }

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
