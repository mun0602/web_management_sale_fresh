import { NextResponse } from 'next/server';
import { signKeyboardToken, verifyKeyboardToken } from '@/lib/auth/keyboard-token';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import redis from '@/lib/redis';
import { isRateLimited, getRateLimitResetSeconds } from '@/lib/rate-limit';

// Dữ liệu mẫu Chủ đề BĐS (Topics)
const mockTopics = [
  { id: 'topic-can-ho', name: 'Căn hộ chung cư', description: 'Các câu mẫu giới thiệu căn hộ chung cư' },
  { id: 'topic-nha-pho', name: 'Nhà phố & Biệt thự', description: 'Giới thiệu nhà đất, biệt thự thổ cư' },
  { id: 'topic-dat-nen', name: 'Đất nền dự án', description: 'Thông tin các low đất nền đang mở bán' },
  { id: 'topic-script-sale', name: 'Kịch bản chào khách', description: 'Kịch bản tin nhắn Zalo/SMS tiếp cận khách hàng' }
];

// Dữ liệu mẫu Câu BĐS (Phrases)
const mockPhrases = [
  {
    id: 'phrase-ch-1',
    vietnamese: 'Chào anh/chị, em gửi thông tin căn hộ Vinhomes Golden River Quận 1: 2PN, 80m2, tầng trung view sông mát mẻ, đã trang bị đầy đủ nội thất cao cấp. Giá bán nhanh 5.2 tỷ bao thuế phí. Anh/chị tiện xem nhà lúc nào ạ?',
    chinese: 'Chào anh/chị, em gửi thông tin căn hộ Vinhomes Golden River Quận 1: 2PN, 80m2, tầng trung view sông mát mẻ, đã trang bị đầy đủ nội thất cao cấp. Giá bán nhanh 5.2 tỷ bao thuế phí. Anh/chị tiện xem nhà lúc nào ạ?',
    topic: 'topic-can-ho',
    subcategory: 'Vinhomes Quận 1',
    sortOrder: 1
  },
  {
    id: 'phrase-ch-2',
    vietnamese: 'Căn hộ 1PN tại Masteri Thảo Điền Quận 2, diện tích 48m2, sổ hồng riêng chính chủ, đang có hợp đồng thuê 12 triệu/tháng ổn định. Rất thích hợp đầu tư giữ tiền. Giá bán 2.8 tỷ thương lượng thiện chí.',
    chinese: 'Căn hộ 1PN tại Masteri Thảo Điền Quận 2, diện tích 48m2, sổ hồng riêng chính chủ, đang có hợp đồng thuê 12 triệu/tháng ổn định. Rất thích hợp đầu tư giữ tiền. Giá bán 2.8 tỷ thương lượng thiện chí.',
    topic: 'topic-can-ho',
    subcategory: 'Masteri Thảo Điền',
    sortOrder: 2
  },
  {
    id: 'phrase-np-1',
    vietnamese: 'Bán nhà phố mặt tiền đường Nguyễn Thị Thập Quận 7, DT 5x20m, xây dựng 1 trệt 3 lầu đang cho chuỗi thời trang thuê 45 triệu/tháng. Vị trí kinh doanh sầm uất đắc địa. Giá 18.5 tỷ chốt bán.',
    chinese: 'Bán nhà phố mặt tiền đường Nguyễn Thị Thập Quận 7, DT 5x20m, xây dựng 1 trệt 3 lầu đang cho chuỗi thời trang thuê 45 triệu/tháng. Vị trí kinh doanh sầm uất đắc địa. Giá 18.5 tỷ chốt bán.',
    topic: 'topic-nha-pho',
    subcategory: 'Mặt tiền Q7',
    sortOrder: 1
  },
  {
    id: 'phrase-np-2',
    vietnamese: 'Biệt thự sân vườn KDC Him Lam Quận 7, diện tích 10x20m, xây dựng hầm trệt 2 lầu áp mái, có hồ bơi nhỏ và sân vườn rộng rãi. Khu an ninh yên tĩnh 24/7. Giá 32 tỷ thương lượng.',
    chinese: 'Biệt thự sân vườn KDC Him Lam Quận 7, diện tích 10x20m, xây dựng hầm trệt 2 lầu áp mái, có hồ bơi nhỏ và sân vườn rộng rãi. Khu an ninh yên tĩnh 24/7. Giá 32 tỷ thương lượng.',
    topic: 'topic-nha-pho',
    subcategory: 'Biệt thự Him Lam',
    sortOrder: 2
  },
  {
    id: 'phrase-dn-1',
    vietnamese: 'Đất nền sổ đỏ Centana Điền Phúc Thành Quận 9, diện tích 5x16m (80m2), trục đường thông 12m. Hướng Đông Nam mát mẻ, xây dựng tự do. Giá tốt nhất thị trường 3.65 tỷ.',
    chinese: 'Đất nền sổ đỏ Centana Điền Phúc Thành Quận 9, diện tích 5x16m (80m2), trục đường thông 12m. Hướng Đông Nam mát mẻ, xây dựng tự do. Giá tốt nhất thị trường 3.65 tỷ.',
    topic: 'topic-dat-nen',
    subcategory: 'Đất nền Q9',
    sortOrder: 1
  },
  {
    id: 'phrase-sc-1',
    vietnamese: 'Dạ em chào anh/chị, em thấy mình đang quan tâm dự án căn hộ tại TP.HCM. Hiện bên em đang có một số căn chủ nhà ngộp cần bán gấp giá rẻ hơn thị trường từ 10-15%. Em xin phép gửi thông tin qua Zalo cho mình tham khảo nhé ạ?',
    chinese: 'Dạ em chào anh/chị, em thấy mình đang quan tâm dự án căn hộ tại TP.HCM. Hiện bên em đang có một số căn chủ nhà ngộp cần bán gấp giá rẻ hơn thị trường từ 10-15%. Em xin phép gửi thông tin qua Zalo cho mình tham khảo nhé ạ?',
    topic: 'topic-script-sale',
    subcategory: 'Tiếp cận khách mới',
    sortOrder: 1
  },
  {
    id: 'phrase-sc-2',
    vietnamese: 'Chào anh/chị, căn hộ mình hỏi hôm trước chủ nhà vừa đồng ý giảm thêm 100 triệu để bán nhanh trong tuần. Hiện tại đây là căn giá tốt nhất block rồi ạ. Anh/chị có muốn qua xem thực tế lại để thương lượng trực tiếp không ạ?',
    chinese: 'Chào anh/chị, căn hộ mình hỏi hôm trước chủ nhà vừa đồng ý giảm thêm 100 triệu để bán nhanh trong tuần. Hiện tại đây là căn giá tốt nhất block rồi ạ. Anh/chị có muốn qua xem thực tế lại để thương lượng trực tiếp không ạ?',
    topic: 'topic-script-sale',
    subcategory: 'Bám đuổi khách cũ',
    sortOrder: 2
  }
];

/**
 * Kiểm tra hạn mức và cộng lượt dùng AI cho user (Prisma + Redis)
 */
async function checkAndIncrAIQuota(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  // 1. Lấy tất cả các subscriptions còn hạn
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: userId,
      status: 'active',
      endDate: { gt: new Date() }
    },
    include: {
      plan: true
    }
  });

  let limit = 5; // Mặc định 5 lượt/ngày cho gói Free
  let isUnlimited = false;

  if (subscriptions && subscriptions.length > 0) {
    let baseLimit = 5;
    let addonLimit = 0;

    for (const sub of subscriptions) {
      const features = sub.plan.features || '';
      if (features.includes('ai_unlimited')) {
        isUnlimited = true;
        limit = -1;
        break;
      }

      const parts = features.split(',');
      for (let f of parts) {
        f = f.trim();
        if (f.startsWith('ai_limit:')) {
          const l = parseInt(f.substring('ai_limit:'.length), 10);
          if (!isNaN(l) && l > baseLimit) {
            baseLimit = l;
          }
        }
        if (f.startsWith('ai_addon:')) {
          const a = parseInt(f.substring('ai_addon:'.length), 10);
          if (!isNaN(a)) {
            addonLimit += a;
          }
        }
      }
    }

    if (!isUnlimited) {
      limit = baseLimit + addonLimit;
    }
  }

  if (isUnlimited) {
    return { allowed: true, limit: -1, current: 0 };
  }

  // 2. Kiểm tra lượt dùng trong ngày trên Redis
  const today = new Date().toISOString().split('T')[0];
  const redisKey = `user:ai_quota:${userId}:${today}`;

  const currentStr = await redis.get(redisKey);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= limit) {
    return { allowed: false, limit, current };
  }

  // Tăng lượt dùng và đặt expire 24h
  const newVal = await redis.incr(redisKey);
  if (newVal === 1) {
    await redis.expire(redisKey, 24 * 60 * 60);
  }

  return { allowed: true, limit, current: newVal };
}

/**
 * Gọi API AI
 */
async function callAI(prompt: string): Promise<string> {
  let apiURL = process.env.AI_API_URL || 'https://vps.mun-ai.art/v1';
  if (!apiURL.endsWith('/chat/completions')) {
    apiURL = apiURL.endsWith('/') ? `${apiURL}chat/completions` : `${apiURL}/chat/completions`;
  }

  const apiKey = process.env.AI_API_KEY || 'sk-77056df5cbf6399d-iadki5-d3d0f1f5';
  const model = process.env.AI_MODEL || 'minimax/MiniMax-M3';

  const minimaxPayload = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Bạn là chuyên gia marketing bất động sản. Hãy viết bài quảng cáo hấp dẫn, chuyên nghiệp bằng tiếng Việt dựa trên thông tin được cung cấp.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  };

  const response = await axios.post(apiURL, minimaxPayload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000 // 120s
  });

  let aiOutput = response.data.choices[0].message.content || '';
  
  // Strip out <think> tags if any
  aiOutput = aiOutput.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();

  return aiOutput;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'topics') {
      // Xác thực token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Chưa xác thực' }, { status: 401 });
      }
      const token = authHeader.substring(7);
      const payload = await verifyKeyboardToken(token);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
      }

      // Thử lấy hoặc lưu cache Redis như bản cũ (tùy chọn, ở đây trả về mock luôn)
      return NextResponse.json({
        success: true,
        topics: mockTopics
      });
    }

    if (action === 'phrases') {
      // Xác thực token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Chưa xác thực' }, { status: 401 });
      }
      const token = authHeader.substring(7);
      const payload = await verifyKeyboardToken(token);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        data: mockPhrases
      });
    }

    if (action === 'validate') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Chưa xác thực' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const payload = await verifyKeyboardToken(token);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
      }

      return NextResponse.json({
        success: true
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in keyboard API GET:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'login') {
      // Rate limiting chống brute force
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      if (isRateLimited(`kb-login:${clientIp}`)) {
        const retryAfter = getRateLimitResetSeconds(`kb-login:${clientIp}`);
        return NextResponse.json({ success: false, message: `Quá nhiều lần thử. Vui lòng đợi ${retryAfter} giây.` }, { status: 429 });
      }

      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
      }

      let user = await prisma.user.findUnique({
        where: { email: username }
      });

      let authenticated = false;
      let role = 'USER';
      let userId = '';

      if (user) {
        if (user.status === 'locked') {
          return NextResponse.json({ success: false, message: 'Tài khoản của bạn đã bị khóa' }, { status: 403 });
        }
        authenticated = await bcrypt.compare(password, user.password);
        role = user.role;
        userId = user.id;
      } else if (process.env.ENABLE_DEMO_AUTH === 'true') {
        const demoEmail = process.env.DEMO_ADMIN_EMAIL;
        const demoPassword = process.env.DEMO_ADMIN_PASSWORD;
        const demoRole = process.env.DEMO_ADMIN_ROLE;
        const demoId = process.env.DEMO_ADMIN_ID;
        if (demoEmail && demoPassword && demoId && demoRole
          && username === demoEmail && password === demoPassword) {
          authenticated = true;
          role = demoRole;
          userId = demoId;
        }
      }

      if (!authenticated) {
        return NextResponse.json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
      }

      // Tạo Session ID và lưu vào Redis để chống đăng nhập nhiều thiết bị
      const sid = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      await redis.set(`session:${userId}`, sid, 'EX', 24 * 60 * 60); // 24 giờ

      const token = await signKeyboardToken({ sub: userId, role: role, sid: sid });

      return NextResponse.json({
        success: true,
        token: token,
        user: {
          username: username
        }
      });
    }

    if (action === 'generate-content') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Chưa xác thực' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const payload = await verifyKeyboardToken(token);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' }, { status: 401 });
      }

      // Kiểm tra và tăng hạn mức AI Quota
      const quota = await checkAndIncrAIQuota(payload.sub);
      if (!quota.allowed) {
        return NextResponse.json({
          success: false,
          message: `Bạn đã vượt quá hạn mức sử dụng AI hàng ngày (${quota.limit} lượt/ngày) của gói cước hiện tại. Vui lòng nâng cấp gói cước để tiếp tục sử dụng!`
        }, { status: 403 });
      }

      const body = await request.json();
      const { prompt } = body;

      if (!prompt) {
        return NextResponse.json({ success: false, message: 'Yêu cầu prompt rỗng' }, { status: 400 });
      }

      try {
        const aiText = await callAI(prompt);

        return NextResponse.json({
          success: true,
          content: aiText,
          ai_limit: quota.limit,
          ai_usage: quota.current
        });
      } catch (aiError: any) {
        console.error('AI Error in keyboard generate-content:', aiError);
        return NextResponse.json({ 
          success: false, 
          message: 'Lỗi khi gọi AI API: ' + aiError.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in keyboard API POST:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
