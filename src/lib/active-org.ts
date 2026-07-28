"use client";

export const ACTIVE_ORG_COOKIE = "fpm_org";

export function setActiveOrgCookie(orgId: string) {
  document.cookie = `${ACTIVE_ORG_COOKIE}=${orgId}; path=/; max-age=31536000; samesite=lax`;
}
