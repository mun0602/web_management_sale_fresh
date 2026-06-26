import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const release = await prisma.apkRelease.findFirst({
      orderBy: { versionCode: 'desc' }
    });
    
    if (!release) {
      return NextResponse.json({ error: 'Chưa có phiên bản APK nào' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: release.id,
        version_name: release.versionName,
        version_code: release.versionCode,
        file_name: release.fileName,
        file_size: Number(release.fileSize),
        changelog: release.changelog,
        uploader: release.uploader,
        created_at: release.createdAt,
        download_url: `/api/apk/download/${release.id}`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
