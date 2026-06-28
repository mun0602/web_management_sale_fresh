import { NextResponse } from 'next/server';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  // Danh sách các phong cách Premium trong Store
  const storeProfiles = [
    {
      id: "store_style_1",
      name: "Reviewer BĐS Thực Tế",
      relationship: "Reviewer nhà đất tự do",
      length: "trung bình",
      emoji_level: "nhiều",
      default_cta: "Bấm follow kênh để cập nhật quỹ căn rẻ nhất thị trường nhé mọi người!",
      default_hashtags: "#reviewbds #tiktokhouse #batdongsan",
      forbidden_words: "cam kết, bảo đảm",
      description: "Phong cách dạng video ngắn TikTok/Reels, tập trung vào trải nghiệm thực tế, giọng văn lôi cuốn, cởi mở."
    },
    {
      id: "store_style_2",
      name: "Nhà là nơi để về",
      relationship: "Chuyên viên kiến tạo không gian sống",
      length: "dài",
      emoji_level: "vừa phải",
      default_cta: "Để lại tin nhắn để nhận trọn bộ sổ hồng và tư vấn phong thủy miễn phí.",
      default_hashtags: "#nhadep #toamhanhphuc #batdongsan",
      forbidden_words: "gấp, cắt lỗ",
      description: "Phong cách ấm áp, nhấn mạnh yếu tố gia đình, không gian sinh hoạt ấm cúng và phong thủy hiền hòa."
    },
    {
      id: "store_style_3",
      name: "Giật tít chốt nhanh",
      relationship: "Chuyên viên tư vấn dự án độc quyền",
      length: "ngắn",
      emoji_level: "nhiều",
      default_cta: "Alo hotline xem nhà ngay 24/7! Cam kết không tranh chấp.",
      default_hashtags: "#bdsnong #bdsgiare #muanha",
      forbidden_words: "",
      description: "Tin đăng ngắn gọn, tập trung thẳng vào giá tốt, vị trí đẹp và giục giã khách mua chốt nhanh kẻo lỡ."
    },
    {
      id: "store_style_4",
      name: "Chuyên Gia Phân Tích Đầu Tư",
      relationship: "Cố vấn tài chính & BĐS dòng tiền",
      length: "dài",
      emoji_level: "ít",
      default_cta: "Đặt lịch tư vấn phân tích dòng tiền ROI thực tế ngay hôm nay.",
      default_hashtags: "#dautubds #daututaichinh #dongtien",
      forbidden_words: "siêu rẻ, giá sập sàn",
      description: "Giọng văn chuyên gia, đáng tin cậy, tập trung vào số liệu, vị trí vĩ mô, khả năng sinh lời và thanh khoản."
    },
    {
      id: "store_style_5",
      name: "Tin đăng dí dỏm",
      relationship: "Hàng xóm thân thiện giới thiệu nhà",
      length: "trung bình",
      emoji_level: "nhiều",
      default_cta: "Qua xem nhà luôn nhé, chủ nhà vui tính sẵn sàng bớt lộc.",
      default_hashtags: "#haihuoc #bdsdocla #funny",
      forbidden_words: "pháp lý",
      description: "Phong cách vui nhộn, hài hước, tạo cảm giác thân mật, gần gũi, thu hút lượt đọc tương tác cao."
    }
  ];

  return NextResponse.json({
    success: true,
    profiles: storeProfiles
  });
}
