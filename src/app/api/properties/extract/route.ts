import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { checkAndIncrAIQuota } from '@/lib/ai-quota';
import axios from 'axios';

export const dynamic = 'force-dynamic';

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

    const response = await axios.post(url, { raw_text }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120s
    });

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
