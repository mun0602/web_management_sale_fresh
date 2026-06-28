import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import axios from 'axios';

export async function POST(request: Request) {
  // 1. Xác thực người dùng thông qua Token bàn phím gửi lên
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const rawText = body.rawText || body.raw_text;

    if (!rawText) {
      return NextResponse.json({ success: false, message: 'Thiếu rawText!' }, { status: 400 });
    }

    // 2. Chuyển tiếp request sang Go Backend
    const GO_SERVER_URL = process.env.GO_SERVER_URL || 'http://localhost:8080';
    const url = `${GO_SERVER_URL}/api/ai/extract`;

    const response = await axios.post(url, { raw_text: rawText }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120s
    });

    // 3. Trả về kết quả trực tiếp cho Client Android
    return NextResponse.json(response.data);
  } catch (err: any) {
    console.error('[AI Extract Proxy Error]:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Lỗi không xác định khi gọi Go AI service';
    return NextResponse.json({ success: false, message }, { status });
  }
}
