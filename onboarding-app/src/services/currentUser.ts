import { SharePointService } from '../generated';
import { SITE } from './onboarding';

export interface CurrentUser {
  email: string;
  name: string;
}

let cached: Promise<CurrentUser> | null = null;

/**
 * Signed-in user's email + display name. The native auth hook does not expose
 * ID-token claims, so we ask SharePoint who the connection's user is.
 */
export function getCurrentUser(): Promise<CurrentUser> {
  if (!cached) {
    cached = (async () => {
      const res = await SharePointService.HttpRequest(SITE, {
        method: 'GET',
        uri: '_api/web/currentuser?$select=Email,Title,UserPrincipalName',
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!res.success) throw new Error('Could not identify the signed-in user');
      const body = res.data as unknown as Record<string, unknown> | null;
      const d = (body?.d as Record<string, unknown> | undefined) ?? body ?? {};
      const email = String(d.Email || d.UserPrincipalName || '').toLowerCase();
      return { email, name: String(d.Title || email) };
    })().catch((err) => {
      cached = null; // allow a retry after transient failures
      throw err;
    });
  }
  return cached;
}
