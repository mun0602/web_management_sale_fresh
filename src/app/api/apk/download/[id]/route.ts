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

    // Chuyển hướng người dùng đến URL file tĩnh trong thư mục public
    return NextResponse.redirect(new URL(`/downloads/apk/${release.fileName}`, req.url));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
