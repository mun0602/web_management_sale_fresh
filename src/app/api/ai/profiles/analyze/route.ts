import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { checkAndIncrAIQuota } from '@/lib/ai-quota';
import { analyzeStyleProfile } from '@/lib/ai-profile-analysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const mode = body.mode || 'sample';
    const input = typeof body.input === 'string' ? body.input.trim() : '';

    if (!input) {
      return NextResponse.json({ success: false, message: 'Vui lòng cung cấp nội dung để phân tích!' }, { status: 400 });
    }

    if (!['sample', 'describe'].includes(mode)) {
      return NextResponse.json({ success: false, message: 'mode phải là "sample" hoặc "describe".' }, { status: 400 });
    }

    const quota = await checkAndIncrAIQuota(session.sub, session.role);
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        message: `Bạn đã vượt quá hạn mức sử dụng AI hàng ngày (${quota.limit} lượt/ngày). Vui lòng nâng cấp gói cước!`,
      }, { status: 403 });
    }

    const suggestedProfile = await analyzeStyleProfile(mode, input);

    return NextResponse.json({ success: true, suggested_profile: suggestedProfile });
  } catch (err: any) {
    console.error('[AI profile analyze] Error:', err);
    return NextResponse.json({ success: false, message: err.message || 'AI phân tích thất bại' }, { status: 500 });
  }
}
