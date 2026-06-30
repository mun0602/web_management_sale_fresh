import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientVersionCodeStr = searchParams.get('version_code');
    
    if (!clientVersionCodeStr) {
      return NextResponse.json({ error: 'Thiếu tham số version_code' }, { status: 400 });
    }

    const clientVersionCode = parseInt(clientVersionCodeStr, 10);
    if (isNaN(clientVersionCode)) {
      return NextResponse.json({ error: 'Tham số version_code phải là một số nguyên hợp lệ' }, { status: 400 });
    }

    // Lấy phiên bản mới nhất trên hệ thống
    const latestRelease = await prisma.apkRelease.findFirst({
      orderBy: { versionCode: 'desc' }
    });

    if (!latestRelease) {
      return NextResponse.json({
        success: true,
        has_update: false,
        message: 'Chưa có phiên bản APK nào trên máy chủ'
      });
    }

    const hasUpdate = latestRelease.versionCode > clientVersionCode;

    return NextResponse.json({
      success: true,
      has_update: hasUpdate,
      latest: {
        id: latestRelease.id,
        version_name: latestRelease.versionName,
        version_code: latestRelease.versionCode,
        changelog: latestRelease.changelog,
        download_url: `/api/apk/download/${latestRelease.id}`,
        created_at: latestRelease.createdAt
      }
    });
  } catch (error: any) {
    console.error('Check update error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi đối chiếu phiên bản' }, { status: 500 });
  }
}
