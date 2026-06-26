/**
 * Helper to serialize BigInt values to standard Numbers
 * because JSON.stringify doesn't support BigInt.
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      res[key] = serializeBigInt(obj[key]);
    }
    return res;
  }
  return obj;
}

/**
 * Standard Vietnamese diacritics removal function
 */
export function cleanAndNormalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
