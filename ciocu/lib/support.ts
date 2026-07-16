// Where to reach us, and where the marketing site lives. Both were duplicated as string literals
// across the legal pages; the menu now links to them too, and three hand-copies of an address that
// must agree is one typo away from mail nobody receives.

/** The inbox a human answers. Shown in the menu's "Email us" and throughout the legal pages. */
export const SUPPORT_EMAIL = "info@ciocu.app";

/**
 * The marketing site. A real subdomain (proxy.ts rewrites get.ciocu.app → /get), so it's absolute:
 * linking to "/get" would keep people on ciocu.app and show the landing page at the wrong address.
 */
export const MARKETING_URL = "https://get.ciocu.app";
