export const SITE_NAME =
  import.meta.env.VITE_SITE_NAME ?? import.meta.env.VITE_BRAND_NAME ?? "Sign UP Jeetwin";

/**
 * Back-compat (older code may import BRAND_NAME).
 */
export const BRAND_NAME = SITE_NAME;
