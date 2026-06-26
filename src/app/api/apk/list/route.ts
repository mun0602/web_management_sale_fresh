import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const releases = await prisma.apkRelease.findMany({
      orderBy: { versionCode: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      data: releases.map(r => ({
        id: r.id,
        version_name: r.versionName,
        version_code: r.versionCode,
        file_name: r.fileName,
        file_size: Number(r.fileSize),
        changelog: r.changelog,
        uploader: r.uploader,
        created_at: r.createdAt,
        download_url: `/api/apk/download/${r.id}`
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
