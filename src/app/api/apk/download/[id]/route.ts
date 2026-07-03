import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    let release;
    if (id === 'latest') {
      release = await prisma.apkRelease.findFirst({
        orderBy: { versionCode: 'desc' }
      });
    } else {
      release = await prisma.apkRelease.findUnique({
        where: { id }
      });
    }
    
    if (!release) {
      return NextResponse.json({ error: 'Không tìm thấy file APK' }, { status: 404 });
    }

    const uploadDir = join(process.cwd(), 'public', 'downloads', 'apk');
    const filePath = join(uploadDir, release.fileName);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Tệp tin không tồn tại trên máy chủ' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    const ext = release.fileName.split('.').pop() || 'apk';
    const contentType = ext === 'tipa' || ext === 'ipa'
      ? 'application/octet-stream'
      : 'application/vnd.android.package-archive';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="sale_keyboard_${release.versionName}.${ext}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
