import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Kiểm tra API Key bảo mật từ headers
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.APK_UPLOAD_API_KEY;

    if (!validApiKey) {
      return NextResponse.json({ error: 'Server chưa được cấu hình API Key bảo mật' }, { status: 500 });
    }

    if (apiKey !== validApiKey) {
      return NextResponse.json({ error: 'Không có quyền truy cập (API Key không hợp lệ)' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('apk') as File | null;
    const versionName = formData.get('version_name') as string || '';
    const changelog = formData.get('changelog') as string || '';
    const uploader = formData.get('uploader') as string || 'Unknown';

    if (!file || !versionName) {
      return NextResponse.json({ error: 'Thiếu file apk hoặc version_name' }, { status: 400 });
    }

    // Đọc file thành Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `sale_keyboard_${Date.now()}.apk`;
    
    // Đảm bảo thư mục lưu trữ tồn tại
    const uploadDir = join(process.cwd(), 'public', 'downloads', 'apk');
    await mkdir(uploadDir, { recursive: true });
    
    // Ghi file ra ổ cứng
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Tính toán version_code tiếp theo
    const maxRelease = await prisma.apkRelease.findFirst({
      orderBy: { versionCode: 'desc' },
      select: { versionCode: true }
    });
    const nextVersionCode = (maxRelease?.versionCode || 0) + 1;

    // Lưu thông tin vào Database
    const release = await prisma.apkRelease.create({
      data: {
        versionName,
        versionCode: nextVersionCode,
        fileName,
        fileSize: BigInt(file.size),
        changelog,
        uploader
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Upload thành công',
      data: {
        id: release.id,
        version_code: release.versionCode,
        version_name: release.versionName
      }
    });
  } catch (error: any) {
    console.error('Upload APK Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi upload' }, { status: 500 });
  }
}
