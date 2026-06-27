import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { checkAndIncrAIQuota } from '@/lib/ai-quota';
import axios from 'axios';
import { callAIProvider } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

function extractJsonObject(raw: string): Record<string, unknown> {
  let content = raw.trim();
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    content = match[1].trim();
  } else {
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return JSON.parse(content);
}

async function extractWithProvider(rawText: string): Promise<Record<string, unknown>> {
  const prompt = `Hãy phân tích tin đăng bất động sản thô sau và trích xuất thông tin thành cấu trúc JSON.
Tin đăng:
${rawText}

Định dạng JSON cần trả về chính xác như sau:
{
  "property_code": "Mã tin đăng hoặc mã căn, nếu không có hãy tự tạo mã ngắn gồm 4-6 ký tự chữ và số viết hoa",
  "title": "Tiêu đề tin đăng ngắn gọn dưới 80 ký tự",
  "description": "Mô tả chi tiết đầy đủ của tin đăng",
  "price_amount": 9000000,
  "price_label": "Nhãn giá hiển thị ngắn gọn",
  "area_m2": 41.0,
  "bedrooms": 3,
  "bathrooms": 2,
  "legal_status": "Tình trạng pháp lý",
  "property_type": "căn hộ hoặc nhà phố hoặc đất hoặc shophouse hoặc khác",
  "address_text": "Địa chỉ chi tiết đầy đủ",
  "province": "Tỉnh/Thành phố",
  "district": "Quận/Huyện",
  "ward": "Phường/Xã"
}

Chỉ trả về chuỗi JSON thô, không markdown, không giải thích.`;

  const raw = await callAIProvider([
    { role: 'system', content: 'Bạn trích xuất dữ liệu bất động sản tiếng Việt chính xác và chỉ trả về JSON hợp lệ.' },
    { role: 'user', content: prompt },
  ]);
  return extractJsonObject(raw);
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const { raw_text } = await request.json();
    if (!raw_text) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung tin đăng thô' }, { status: 400 });
    }

    // Kiểm tra và tăng quota AI
    const quota = await checkAndIncrAIQuota(session.sub, session.role);
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        message: `Bạn đã vượt quá hạn mức sử dụng AI hàng ngày (${quota.limit} lượt/ngày). Vui lòng nâng cấp gói cước!`
      }, { status: 403 });
    }

    // Gọi sang Go Backend để trích xuất thông tin BĐS bằng LLM
    const GO_SERVER_URL = process.env.GO_SERVER_URL || 'http://localhost:8080';
    const url = `${GO_SERVER_URL}/api/ai/extract`;

    let response;
    try {
      response = await axios.post(url, { raw_text }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120s
      });
    } catch (goErr: any) {
      console.warn('[NextJS extract route] Go backend unavailable, falling back to direct provider:', goErr.message);
      const data = await extractWithProvider(raw_text);
      return NextResponse.json({ success: true, data });
    }

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        data: response.data.data
      });
    }

    return NextResponse.json({
      success: false,
      message: response.data?.message || 'Lỗi trích xuất thông tin từ Go Backend'
    }, { status: 500 });

  } catch (err: any) {
    console.error('[NextJS extract route] Error:', err.message);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ kết nối dịch vụ trích xuất AI: ' + err.message }, { status: 500 });
  }
}
