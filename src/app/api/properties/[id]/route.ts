import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { serializeBigInt, cleanAndNormalize } from '@/lib/serialize';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: {
      id,
      ownerUserId: session.sub,
      deletedAt: null
    },
    include: {
      media: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!property) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ này!' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt(property)
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const existing = await prisma.property.findFirst({
      where: {
        id,
        ownerUserId: session.sub,
        deletedAt: null
      }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ này!' }, { status: 404 });
    }

    const body = await request.json();
    
    // Check code unique if changing code
    if (body.property_code && body.property_code !== existing.propertyCode) {
      const codeConflict = await prisma.property.findFirst({
        where: {
          ownerUserId: session.sub,
          propertyCode: body.property_code,
          id: { not: id },
          deletedAt: null
        }
      });
      if (codeConflict) {
        return NextResponse.json({ success: false, message: 'Mã căn hộ mới này đã bị trùng lặp!' }, { status: 400 });
      }
    }

    const updatedCode = body.property_code || existing.propertyCode;
    const updatedTitle = body.title || existing.title;
    const updatedDesc = body.description || existing.description;
    const updatedProvince = body.province !== undefined ? body.province : existing.province;
    const updatedDistrict = body.district !== undefined ? body.district : existing.district;
    
    const searchNorm = cleanAndNormalize(`${updatedCode} ${updatedTitle} ${updatedDesc} ${updatedDistrict || ''} ${updatedProvince || ''}`);

    await prisma.property.update({
      where: { id },
      data: {
        propertyCode: updatedCode,
        title: updatedTitle,
        description: updatedDesc,
        addressText: body.address_text !== undefined ? body.address_text : existing.addressText,
        province: updatedProvince,
        district: updatedDistrict,
        ward: body.ward !== undefined ? body.ward : existing.ward,
        propertyType: body.property_type !== undefined ? body.property_type : existing.propertyType,
        priceAmount: body.price_amount !== undefined ? BigInt(body.price_amount) : existing.priceAmount,
        priceLabel: body.price_label !== undefined ? body.price_label : existing.priceLabel,
        areaM2: body.area_m2 !== undefined ? (body.area_m2 ? parseFloat(body.area_m2) : null) : existing.areaM2,
        bedrooms: body.bedrooms !== undefined ? (body.bedrooms ? parseInt(body.bedrooms) : null) : existing.bedrooms,
        bathrooms: body.bathrooms !== undefined ? (body.bathrooms ? parseInt(body.bathrooms) : null) : existing.bathrooms,
        legalStatus: body.legal_status !== undefined ? body.legal_status : existing.legalStatus,
        saleStatus: body.sale_status !== undefined ? body.sale_status : existing.saleStatus,
        isPinned: body.is_pinned !== undefined ? parseInt(body.is_pinned) : existing.isPinned,
        searchTextNormalized: searchNorm
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật căn hộ thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const existing = await prisma.property.findFirst({
      where: {
        id,
        ownerUserId: session.sub,
        deletedAt: null
      }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ này!' }, { status: 404 });
    }

    await prisma.property.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa căn hộ thành công!'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
