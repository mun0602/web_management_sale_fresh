import { callAIProvider } from './ai-provider';

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

function buildPrompt(mode: string): string {
  if (mode === 'sample') {
    return `Bạn là chuyên gia phân tích phong cách viết bài bất động sản tiếng Việt.
Hãy phân tích bài viết mẫu và trích xuất phong cách viết thành một profile JSON.

Các trường bắt buộc:
- name: tên profile bằng tiếng Việt
- relationship: cặp xưng hô, ví dụ "Em - Anh/Chị", "Mình - Bạn", "Tôi - Quý khách"
- length: một trong "ngắn", "trung bình", "dài"
- emoji_level: một trong "ít", "vừa phải", "nhiều"
- default_cta: CTA thường dùng
- default_hashtags: hashtag thường dùng
- forbidden_words: từ nên tránh, để trống nếu không có

Chỉ trả về JSON object hợp lệ, không markdown, không giải thích.`;
  }

  return `Bạn là chuyên gia tạo phong cách viết bài bất động sản tiếng Việt.
Dựa trên mô tả của người dùng, hãy tạo một profile phong cách viết phù hợp.

Các trường bắt buộc:
- name: tên profile bằng tiếng Việt
- relationship: cặp xưng hô, ví dụ "Em - Anh/Chị", "Mình - Bạn", "Tôi - Quý khách"
- length: một trong "ngắn", "trung bình", "dài"
- emoji_level: một trong "ít", "vừa phải", "nhiều"
- default_cta: CTA phù hợp
- default_hashtags: hashtag phù hợp
- forbidden_words: từ nên tránh, để trống nếu không có

Chỉ trả về JSON object hợp lệ, không markdown, không giải thích.`;
}

export async function analyzeStyleProfile(mode: string, input: string) {
  const raw = await callAIProvider([
    { role: 'system', content: buildPrompt(mode) },
    { role: 'user', content: input },
  ]);

  const suggestedProfile = extractJsonObject(raw) as Record<string, unknown>;
  const fields = ['name', 'relationship', 'length', 'emoji_level', 'default_cta', 'default_hashtags', 'forbidden_words'];
  for (const field of fields) {
    if (suggestedProfile[field] === undefined) suggestedProfile[field] = '';
  }
  if (mode === 'sample') {
    suggestedProfile.samples = [input];
  }

  return suggestedProfile;
}

