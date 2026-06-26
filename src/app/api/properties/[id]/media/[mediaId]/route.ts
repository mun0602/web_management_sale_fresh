import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id: propertyId, mediaId } = await params;

  try {
    const media = await prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId }
    });

    if (!media) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy tệp media này!' }, { status: 404 });
    }

    // Delete DB record
    await prisma.propertyMedia.delete({
      where: { id: mediaId }
    });

    // Try deleting physical files
    const deleteFile = async (relPath: string) => {
      if (relPath.startsWith('/uploads/')) {
        const fullPath = path.join(process.cwd(), 'public', relPath);
        try {
          await fs.unlink(fullPath);
        } catch (e) {
          console.warn('Failed to delete physical file:', fullPath, e);
        }
      }
    };

    await deleteFile(media.url);
    if (media.thumbnailUrl) {
      await deleteFile(media.thumbnailUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tệp media thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
