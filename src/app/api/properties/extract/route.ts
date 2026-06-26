import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export const dynamic = 'force-dynamic';

const BUILD_VERSION = '2026-06-27T01:31-v3-fetch';

export async function GET() {
  return NextResponse.json({ version: BUILD_VERSION, status: 'ok' });
}

function cleanAIContent(text: string): string {
  let cleaned = text.trim();
  // Remove <think>...</think> tags (MiniMax-M3 reasoning)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  return cleaned;
}

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
        content: 'Bạn là trợ lý AI chuyên phân tích bất động sản. QUAN TRỌNG: Chỉ trả về JSON thô, KHÔNG bao gồm suy luận, thẻ think, hay giải thích.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 1500,
    stream: false
  };

  console.log('[extract/callAI] Calling:', apiURL, 'model:', model);

  const res = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000)
  });

  const rawText = await res.text();
  console.log('[extract/callAI] HTTP status:', res.status, 'body length:', rawText.length);

  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${rawText.substring(0, 200)}`);
  }

  // Parse JSON response  
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[extract/callAI] Failed to parse AI API response:', rawText.substring(0, 300));
    // Fallback: try to extract content from SSE stream format
    const lines = rawText.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');
    if (lines.length > 0) {
      const chunks: string[] = [];
      for (const line of lines) {
        try {
          const obj = JSON.parse(line.substring(6));
          const delta = obj.choices?.[0]?.delta?.content || obj.choices?.[0]?.message?.content || '';
          if (delta) chunks.push(delta);
        } catch { /* skip unparseable chunks */ }
      }
      if (chunks.length > 0) {
        const assembled = chunks.join('');
        console.log('[extract/callAI] Assembled from SSE, length:', assembled.length);
        return cleanAIContent(assembled);
      }
    }
    throw new Error(`Cannot parse AI response: ${rawText.substring(0, 100)}`);
  }

  const content = data.choices?.[0]?.message?.content || '';
  console.log('[extract/callAI] Content length:', content.length, 'starts with:', content.substring(0, 80));
  return cleanAIContent(content);
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

Định dạng JSON cần trả về chính xác như sau (các trường không có thông tin thì để null hoặc chuỗi rỗng):
{
  "property_code": "Mã căn 4-6 ký tự (ví dụ: ND0670)",
  "title": "Tiêu đề ngắn gọn dưới 80 ký tự",
  "description": "Mô tả chi tiết đầy đủ",
  "price_amount": 9000000,
  "price_label": "9 Triệu/tháng",
  "area_m2": 41.0,
  "bedrooms": 3,
  "bathrooms": 2,
  "legal_status": "",
  "property_type": "căn hộ",
  "address_text": "Địa chỉ đầy đủ",
  "province": "Hà Nội",
  "district": "Nam Từ Liêm",
  "ward": "Đại Mỗ"
}

CHỈ TRẢ VỀ JSON THÔ. KHÔNG có markdown code block, KHÔNG giải thích, KHÔNG có thẻ think.`;

    const aiText = await callAI(prompt);
    console.log('[extract] Cleaned text (first 200):', aiText.substring(0, 200));

    const data = JSON.parse(aiText);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('[extract] Error:', err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
