import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import axios from 'axios';

async function callAI(prompt: string): Promise<string> {
  let apiURL = process.env.AI_API_URL || 'https://vps.mun-ai.art/v1';
  if (!apiURL.endsWith('/chat/completions')) {
    apiURL = apiURL.endsWith('/') ? `${apiURL}chat/completions` : `${apiURL}/chat/completions`;
  }

  const apiKey = process.env.AI_API_KEY || 'sk-77056df5cbf6399d-iadki5-d3d0f1f5';
  const model = process.env.AI_MODEL || 'minimax/MiniMax-M3';

  const payload = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Bạn là trợ lý AI chuyên viết content quảng cáo, giới thiệu bất động sản bằng tiếng Việt cuốn hút, tối ưu Zalo/Facebook/SMS.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 1500
  };

  const response = await axios.post(apiURL, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  });

  return response.data.choices[0].message.content || '';
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const { raw_text } = await request.json();
    if (!raw_text) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung tin đăng thô' }, { status: 400 });
    }

    const prompt = `Hãy phân tích tin đăng bất động sản thô sau và trích xuất thông tin thành cấu trúc JSON.
Tin đăng:
${raw_text}

Định dạng JSON cần trả về chính xác như sau (các trường không có thông tin thì để null hoặc chuỗi rỗng phù hợp):
{
  "property_code": "Mã tin đăng hoặc mã căn (nếu có, ví dụ: ND0670, VH-GP-1202, nếu không có hãy tự tạo mã ngắn gồm 4-6 ký tự chữ và số viết hoa)",
  "title": "Tiêu đề tin đăng ngắn gọn, hấp dẫn dưới 80 ký tự (Ví dụ: Thuê nhà Đại Mỗ Nam Từ Liêm 41m2 3 tầng)",
  "description": "Mô tả chi tiết đầy đủ của tin đăng (giữ nguyên các thông tin quan trọng như liên hệ, thanh toán, tiện ích)",
  "price_amount": 9000000 (Giá trị số VND dạng số nguyên BIGINT. Chú ý: 9 triệu/tháng thì điền 9000000. 9 tỷ thì điền 9000000000. Nếu là tin thuê, điền giá thuê theo tháng. Chỉ điền số nguyên, không điền chữ. Nếu không có giá điền 0),
  "price_label": "Nhãn giá hiển thị ngắn gọn (Ví dụ: 9 Triệu/tháng, 9 Tỷ, 3.5 Tỷ)",
  "area_m2": 41.0 (Diện tích m2 dạng số thực FLOAT. Nếu không có điền 0),
  "bedrooms": 3 (Số phòng ngủ dạng số nguyên INT. Nếu không có điền 0),
  "bathrooms": 2 (Số phòng tắm/WC dạng số nguyên INT. Nếu không có điền 0),
  "legal_status": "Tình trạng pháp lý (Ví dụ: Sổ đỏ, Sổ hồng riêng, Hợp đồng mua bán, nếu không có để trống)",
  "property_type": "Loại bất động sản. Chỉ được chọn một trong các giá trị viết thường sau: 'căn hộ', 'nhà phố', 'đất', 'shophouse', 'khác'",
  "address_text": "Địa chỉ chi tiết đầy đủ (Ví dụ: 299.X Đại Mỗ, Nam Từ Liêm, Hà Nội)",
  "province": "Tỉnh/Thành phố (Ví dụ: Hà Nội hoặc Hồ Chí Minh, nếu không rõ dựa vào quận huyện để tự điền tỉnh thành phù hợp)",
  "district": "Quận/Huyện (Ví dụ: Nam Từ Liêm, Quận 3, Thủ Đức)",
  "ward": "Phường/Xã (Ví dụ: Đại Mỗ, Thảo Điền, Hiệp Bình Phước)"
}

Chỉ trả về chuỗi JSON thô, không bao quanh bằng dấu nháy ngược (markdown code block), không kèm lời giải thích nào khác!`;

    let aiText = await callAI(prompt);
    
    // Clean up markdown block formatting if present
    aiText = aiText.trim();
    aiText = aiText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    const data = JSON.parse(aiText);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
