import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const release = await prisma.apkRelease.findUnique({
      where: { id }
    });
    
    if (!release) {
      return NextResponse.json({ error: 'Không tìm thấy file APK' }, { status: 404 });
    }

    // Lấy hostname và protocol thực tế từ headers để redirect chính xác (tránh bị hostname nội bộ của Docker container)
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'munbds.shop';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const redirectUrl = `${proto}://${host}/downloads/apk/${release.fileName}`;

    // Chuyển hướng người dùng đến URL file tĩnh trong thư mục public
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
