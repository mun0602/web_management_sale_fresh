import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id: propertyId } = await params;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerUserId: session.sub, deletedAt: null }
  });

  if (!property) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ này!' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy tệp tải lên!' }, { status: 400 });
    }

    const currentMediaCount = await prisma.propertyMedia.count({
      where: { propertyId }
    });
    let nextSortOrder = currentMediaCount + 1;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const thumbnailDir = path.join(uploadDir, 'thumbnails');
    
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(thumbnailDir, { recursive: true });

    const coverExists = await prisma.propertyMedia.findFirst({
      where: { propertyId, isCover: 1 }
    });
    let hasCover = !!coverExists;

    const mediaList = [];

    for (const file of files) {
      const mediaId = `pmedia_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const ext = path.extname(file.name);
      const filename = `${propertyId}_${Date.now()}${ext.toLowerCase()}`;
      const filePath = path.join(uploadDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      const relativeUrl = `/uploads/${filename}`;
      let relativeThumbUrl = `/uploads/${filename}`;
      const mimeType = file.type || 'image/jpeg';
      const isVideo = mimeType.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      if (!isVideo) {
        relativeThumbUrl = `/uploads/thumbnails/${filename}`;
        const thumbPath = path.join(thumbnailDir, filename);
        await fs.writeFile(thumbPath, buffer); // Copy for thumbnail
      }

      let isCover = 0;
      if (!hasCover && !isVideo) {
        isCover = 1;
        hasCover = true;
      }

      const mediaRecord = await prisma.propertyMedia.create({
        data: {
          id: mediaId,
          propertyId,
          type: mediaType,
          url: relativeUrl,
          thumbnailUrl: relativeThumbUrl,
          caption: file.name,
          mimeType,
          fileSize: file.size,
          isCover,
          sortOrder: nextSortOrder
        }
      });

      mediaList.push({
        id: mediaId,
        type: mediaType,
        url: relativeUrl,
        thumbnail_url: relativeThumbUrl,
        is_cover: isCover,
        sort_order: nextSortOrder
      });

      nextSortOrder++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã tải lên ${files.length} tệp thành công!`,
      data: mediaList
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
