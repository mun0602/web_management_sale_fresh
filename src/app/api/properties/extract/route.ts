import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { checkAndIncrAIQuota } from '@/lib/ai-quota';

export const dynamic = 'force-dynamic';

const BUILD_VERSION = '2026-06-27T01:41-v4-indexof';

export async function GET() {
  return NextResponse.json({ version: BUILD_VERSION, status: 'ok' });
}

// Extract JSON object from any AI response - handles <think> tags, markdown blocks, etc.
function extractJSON(text: string): string {
  // Skip past </think> tag if present
  let searchStart = 0;
  const thinkEnd = text.indexOf('</think>');
  if (thinkEnd !== -1) {
    searchStart = thinkEnd + 8; // length of '</think>'
  }
  
  const firstBrace = text.indexOf('{', searchStart);
  if (firstBrace === -1) {
    throw new Error(`No JSON object found in AI response: ${text.substring(0, 150)}`);
  }
  
  // Use brace counting to find matching closing brace
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return text.substring(firstBrace, i + 1); }
  }
  
  throw new Error(`Unbalanced braces in AI response: ${text.substring(firstBrace, firstBrace + 100)}`);
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
        return assembled;
      }
    }
    throw new Error(`Cannot parse AI response: ${rawText.substring(0, 100)}`);
  }

  const content = data.choices?.[0]?.message?.content || '';
  console.log('[extract/callAI] Content length:', content.length, 'starts with:', content.substring(0, 80));
  return content;
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const { raw_text } = await request.json();
    if (!raw_text) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung tin đăng thô' }, { status: 400 });
    }

    // Kiểm tra hạn mức AI trước khi gọi
    const quota = await checkAndIncrAIQuota(session.sub);
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        message: `Bạn đã vượt quá hạn mức sử dụng AI hàng ngày (${quota.limit} lượt/ngày). Vui lòng nâng cấp gói cước!`
      }, { status: 403 });
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

    const rawAiText = await callAI(prompt);
    console.log('[extract] Raw AI text (first 300):', rawAiText.substring(0, 300));
    
    const jsonText = extractJSON(rawAiText);
    console.log('[extract] Extracted JSON (first 200):', jsonText.substring(0, 200));
    
    const data = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('[extract] Error:', err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
