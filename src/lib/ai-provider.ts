export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function normalizeApiUrl(url: string): string {
  if (url.endsWith('/chat/completions')) return url;
  return `${url.replace(/\/$/, '')}/chat/completions`;
}

function stripReasoningTags(content: string): string {
  let result = content;
  for (;;) {
    const start = result.indexOf('<think>');
    const end = result.indexOf('</think>');
    if (start !== -1 && end !== -1 && end > start) {
      result = result.slice(0, start) + result.slice(end + '</think>'.length);
    } else {
      return result.trim();
    }
  }
}

export async function callAIProvider(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('Máy chủ chưa cấu hình AI_API_KEY');
  }

  const apiUrl = normalizeApiUrl(process.env.AI_API_URL || 'https://vps.mun-ai.art/v1');
  const model = process.env.AI_MODEL || 'minimax/MiniMax-M3';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text in the error below.
  }

  if (!response.ok) {
    throw new Error(`AI API returned status ${response.status}: ${text}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('AI API không trả về nội dung hợp lệ');
  }

  return stripReasoningTags(content);
}

export async function generateRealEstateContent(prompt: string): Promise<string> {
  return callAIProvider([
    {
      role: 'system',
      content: 'Bạn là trợ lý AI chuyên viết content quảng cáo, giới thiệu bất động sản bằng tiếng Việt cuốn hút, tối ưu Zalo/Facebook/SMS.',
    },
    { role: 'user', content: prompt },
  ]);
}

