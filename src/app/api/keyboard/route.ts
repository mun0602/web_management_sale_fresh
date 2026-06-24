import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken, verifyToken } from '@/lib/auth/token';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.ADMIN_SESSION_SECRET || 'fallback-secret-at-least-32-random-bytes';

// Dữ liệu mẫu Chủ đề BĐS (Topics)
const mockTopics = [
  { id: 'topic-can-ho', name: 'Căn hộ chung cư', description: 'Các câu mẫu giới thiệu căn hộ chung cư' },
  { id: 'topic-nha-pho', name: 'Nhà phố & Biệt thự', description: 'Giới thiệu nhà đất, biệt thự thổ cư' },
  { id: 'topic-dat-nen', name: 'Đất nền dự án', description: 'Thông tin các lô đất nền đang mở bán' },
  { id: 'topic-script-sale', name: 'Kịch bản chào khách', description: 'Kịch bản tin nhắn Zalo/SMS tiếp cận khách hàng' }
];

// Dữ liệu mẫu Câu BĐS (Phrases - Việt & Trung)
const mockPhrases = [
  {
    id: 'phrase-ch-1',
    vietnamese: 'Chào anh/chị, em gửi thông tin căn hộ Vinhomes Golden River Quận 1: 2PN, 80m2, tầng trung view sông mát mẻ, đã trang bị đầy đủ nội thất cao cấp. Giá bán nhanh 5.2 tỷ bao thuế phí. Anh/chị tiện xem nhà lúc nào ạ?',
    chinese: '您好，这是第一郡 Vinhomes Golden River 公予信息：2房，80平米，中层河景，豪装家具齐全。售价 52 亿越盾。您什么时候方便看房？',
    topic: 'topic-can-ho',
    subcategory: 'Vinhomes Quận 1',
    sortOrder: 1
  },
  {
    id: 'phrase-ch-2',
    vietnamese: 'Căn hộ 1PN tại Masteri Thảo Điền Quận 2, diện tích 48m2, sổ hồng riêng chính chủ, đang có hợp đồng thuê 12 triệu/tháng ổn định. Rất thích hợp đầu tư giữ tiền. Giá bán 2.8 tỷ thương lượng thiện chí.',
    chinese: '第二郡 Masteri Thảo Điền 1房公予，48平米，独立红书，带稳定租约1200万/月。售价 28 亿越盾，可议价。',
    topic: 'topic-can-ho',
    subcategory: 'Masteri Thảo Điền',
    sortOrder: 2
  },
  {
    id: 'phrase-np-1',
    vietnamese: 'Bán nhà phố mặt tiền đường Nguyễn Thị Thập Quận 7, DT 5x20m, xây dựng 1 trệt 3 lầu đang cho chuỗi thời trang thuê 45 triệu/tháng. Vị trí kinh doanh sầm uất đắc địa. Giá 18.5 tỷ chốt bán.',
    chinese: '第七郡 Nguyễn Thị Thập 路面房，面积 5x20m，1底3楼，现租金4500万/月，位置极佳。售价 185 亿越盾。',
    topic: 'topic-nha-pho',
    subcategory: 'Mặt tiền Q7',
    sortOrder: 1
  },
  {
    id: 'phrase-np-2',
    vietnamese: 'Biệt thự sân vườn KDC Him Lam Quận 7, diện tích 10x20m, xây dựng hầm trệt 2 lầu áp mái, có hồ bơi nhỏ và sân vườn rộng rãi. Khu an ninh yên tĩnh 24/7. Giá 32 tỷ thương lượng.',
    chinese: '第七郡 Him Lam 别墅，面积 10x20m, 1地下室1底2楼，带泳池和花园。24/7保安。售价 320 亿越盾。',
    topic: 'topic-nha-pho',
    subcategory: 'Biệt thự Him Lam',
    sortOrder: 2
  },
  {
    id: 'phrase-dn-1',
    vietnamese: 'Đất nền sổ đỏ Centana Điền Phúc Thành Quận 9, diện tích 5x16m (80m2), trục đường thông 12m. Hướng Đông Nam mát mẻ, xây dựng tự do. Giá tốt nhất thị trường 3.65 tỷ.',
    chinese: '第九郡 Centana 田福东土地，5x16m (80平米)，路宽12米。东南向，可自由建造。售价 36.5 亿越盾。',
    topic: 'topic-dat-nen',
    subcategory: 'Đất nền Q9',
    sortOrder: 1
  },
  {
    id: 'phrase-sc-1',
    vietnamese: 'Dạ em chào anh/chị, em thấy mình đang quan tâm dự án căn hộ tại TP.HCM. Hiện bên em đang có một số căn chủ nhà ngập cần bán gấp giá rẻ hơn thị trường từ 10-15%. Em xin phép gửi thông tin qua Zalo cho mình tham khảo nhé ạ?',
    chinese: '您好，得知您关注胡志明市公寓项目。目前我们有一些业主急售房源，比市场价低 10-15%。我可以加您 Zalo 发资料吗？',
    topic: 'topic-script-sale',
    subcategory: 'Tiếp cận khách mới',
    sortOrder: 1
  },
  {
    id: 'phrase-sc-2',
    vietnamese: 'Chào anh/chị, căn hộ mình hỏi hôm trước chủ nhà vừa đồng ý giảm thêm 100 triệu để bán nhanh trong tuần. Hiện tại đây là căn giá tốt nhất block rồi ạ. Anh/chị có muốn qua xem thực tế lại để thương lượng trực tiếp không ạ?',
    chinese: '您好，您之前看的公寓业主刚同意降价 1 亿越盾以便在本周内急售。目前这是该栋楼价格最好的房源。您想来看房并与业主直接面谈吗？',
    topic: 'topic-script-sale',
    subcategory: 'Bám đuổi khách cũ',
    sortOrder: 2
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'topics') {
      // Trả về danh sách chủ đề
      return NextResponse.json({
        success: true,
        topics: mockTopics
      });
    }

    if (action === 'phrases') {
      // Trả về danh sách câu mẫu
      return NextResponse.json({
        success: true,
        data: mockPhrases
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
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
      }

      // Kiểm tra tài khoản trong database
      let user = await prisma.user.findUnique({
        where: { email: username }
      });

      let authenticated = false;
      let role = 'USER';
      let userId = '';

      if (user) {
        authenticated = await bcrypt.compare(password, user.password);
        role = user.role;
        userId = user.id;
      } else {
        // Fallback cho tài khoản admin mẫu
        const demoEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@example.com';
        const demoPassword = process.env.DEMO_ADMIN_PASSWORD || 'password123';
        if (username === demoEmail && password === demoPassword) {
          authenticated = true;
          role = 'SUPER_ADMIN';
          userId = 'demo-admin-uuid';
        }
      }

      if (!authenticated) {
        return NextResponse.json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
      }

      // Ký JWT Token cho bàn phím
      const token = signToken({ sub: userId, role: role as any });

      return NextResponse.json({
        success: true,
        token: token,
        user: {
          username: username
        }
      });
    }

    if (action === 'generate-content') {
      // Xác thực token bàn phím gửi kèm trong header Authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Chưa xác thực' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
      }

      const body = await request.json();
      const { prompt } = body;

      if (!prompt) {
        return NextResponse.json({ success: false, message: 'Yêu cầu prompt rỗng' }, { status: 400 });
      }

      // Xử lý tạo nội dung mẫu hoặc gọi AI (Mô phỏng viết bài sale BĐS)
      const mockAiOutput = `🏠 [TIN HOT BẤT ĐỘNG SẢN] 🏠\n\n🎯 Dự án bạn quan tâm: "${prompt}"\n\n✨ Đặc điểm nổi bật:\n- Vị trí đắc địa, kết nối giao thông thuận tiện.\n- Pháp lý hoàn chỉnh, sổ hồng riêng trao tay.\n- Khu dân cư an ninh, tiện ích nội ngoại khu đầy đủ.\n- Giá bán cạnh tranh, có thương lượng lộc lá cho khách thiện chí.\n\n📞 Liên hệ ngay để nhận báo giá chi tiết và lịch hẹn xem nhà thực tế!`;

      return NextResponse.json({
        success: true,
        content: mockAiOutput
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in keyboard API POST:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
