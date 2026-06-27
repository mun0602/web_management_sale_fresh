import { getSessionAdmin } from './session';

export async function getAuthorizedAdmin(request?: Request) {
  void request;

  const admin = await getSessionAdmin();
  if (!admin) return null;

  if (!['SUPER_ADMIN', 'FINANCE', 'SUPPORT'].includes(admin.role)) {
    return null;
  }

  return admin;
}
