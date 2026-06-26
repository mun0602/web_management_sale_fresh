import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedUser, unauthorizedResponse } from '@/lib/auth/keyboard-auth';
import { serializeBigInt, cleanAndNormalize } from '@/lib/serialize';

export async function GET(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const province = searchParams.get('province') || '';
  const district = searchParams.get('district') || '';
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
  const propertyType = searchParams.get('property_type') || '';
  const saleStatus = searchParams.get('sale_status') || '';
  const groupId = searchParams.get('groupId') || '';
  const sort = searchParams.get('sort') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  let whereClause: any = {
    ownerUserId: session.sub,
    deletedAt: null
  };

  if (province) whereClause.province = province;
  if (district) whereClause.district = district;
  if (propertyType) whereClause.propertyType = propertyType;
  if (saleStatus) whereClause.saleStatus = saleStatus;

  if (q) {
    whereClause.searchTextNormalized = {
      contains: cleanAndNormalize(q)
    };
  }

  if (minPrice !== null || maxPrice !== null) {
    whereClause.priceAmount = {};
    if (minPrice !== null) whereClause.priceAmount.gte = BigInt(minPrice);
    if (maxPrice !== null) whereClause.priceAmount.lte = BigInt(maxPrice);
  }

  if (groupId) {
    const group = await prisma.propertyGroup.findFirst({
      where: { id: groupId, ownerUserId: session.sub }
    });
    if (group) {
      if (group.groupType === 'manual') {
        whereClause.groupMembers = {
          some: { groupId: groupId }
        };
      } else if (group.groupType === 'saved_filter' && group.filterJson) {
        try {
          const filters = JSON.parse(group.filterJson);
          if (filters.q) whereClause.searchTextNormalized = { contains: cleanAndNormalize(filters.q) };
          if (filters.province) whereClause.province = filters.province;
          if (filters.district) whereClause.district = filters.district;
          if (filters.property_type) whereClause.propertyType = filters.property_type;
          if (filters.sale_status) whereClause.saleStatus = filters.sale_status;
          if (filters.minPrice || filters.maxPrice) {
            whereClause.priceAmount = {};
            if (filters.minPrice) whereClause.priceAmount.gte = BigInt(parseFloat(filters.minPrice));
            if (filters.maxPrice) whereClause.priceAmount.lte = BigInt(parseFloat(filters.maxPrice));
          }
        } catch (e) {
          console.error('Error parsing group filters:', e);
        }
      }
    }
  }

  let orderByClause: any = [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }];
  if (sort === 'price_asc') {
    orderByClause = [{ priceAmount: 'asc' }, { updatedAt: 'desc' }];
  } else if (sort === 'price_desc') {
    orderByClause = [{ priceAmount: 'desc' }, { updatedAt: 'desc' }];
  } else if (sort === 'updated_at') {
    orderByClause = [{ updatedAt: 'desc' }];
  }

  const properties = await prisma.property.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: offset,
    take: limit,
    include: {
      media: {
        where: { isCover: 1 },
        take: 1
      }
    }
  });

  const mappedProperties = properties.map((p: any) => {
    const coverUrl = p.media && p.media.length > 0 ? p.media[0].url : null;
    const { media, ...rest } = p;
    return {
      ...rest,
      cover_url: coverUrl
    };
  });

  return NextResponse.json({
    success: true,
    data: serializeBigInt(mappedProperties)
  });
}

export async function POST(request: Request) {
  const session = await getAuthorizedUser(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      property_code,
      title,
      description,
      address_text,
      province,
      district,
      ward,
      property_type,
      price_amount,
      price_label,
      area_m2,
      bedrooms,
      bathrooms,
      legal_status,
      sale_status,
      is_pinned
    } = body;

    if (!property_code || !title || !description) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    const exists = await prisma.property.findFirst({
      where: {
        ownerUserId: session.sub,
        propertyCode: property_code,
        deletedAt: null
      }
    });

    if (exists) {
      return NextResponse.json({ success: false, message: 'Mã căn hộ này đã tồn tại trong kho của bạn!' }, { status: 400 });
    }

    const id = `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const searchNorm = cleanAndNormalize(`${property_code} ${title} ${description} ${district || ''} ${province || ''}`);

    const computedPriceLabel = price_label || `${(Number(price_amount) / 1e9).toFixed(1)} Tỷ`;
    const computedPropType = property_type || 'căn hộ';
    const computedSaleStatus = sale_status || 'đang bán';

    await prisma.property.create({
      data: {
        id,
        ownerUserId: session.sub,
        propertyCode: property_code,
        title,
        description,
        addressText: address_text || null,
        province: province || null,
        district: district || null,
        ward: ward || null,
        propertyType: computedPropType,
        priceAmount: BigInt(price_amount || 0),
        priceLabel: computedPriceLabel,
        areaM2: area_m2 ? parseFloat(area_m2) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        legalStatus: legal_status || null,
        saleStatus: computedSaleStatus,
        searchTextNormalized: searchNorm,
        isPinned: is_pinned ? parseInt(is_pinned) : 0,
        sortOrder: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm căn hộ mới thành công!',
      id
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
