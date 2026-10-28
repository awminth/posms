/** Local default assets when no uploaded image exists. */
export const DEFAULT_PRODUCT_IMAGE = '/default-product.webp';
export const DEFAULT_AVATAR = '/default-avatar.svg';

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Product image: local upload only; missing/remote → Marctober product logo. */
export function resolveProductImage(url?: string | null): string {
  const v = (url || '').trim();
  if (!v || isRemoteUrl(v)) return DEFAULT_PRODUCT_IMAGE;
  return v;
}

/** User avatar: local upload only; missing/remote → profile silhouette (not product logo). */
export function resolveAvatar(url?: string | null): string {
  const v = (url || '').trim();
  if (!v || isRemoteUrl(v)) return DEFAULT_AVATAR;
  // Never reuse product default asset as a profile photo
  if (
    v === DEFAULT_PRODUCT_IMAGE ||
    v.endsWith('/default-product.webp') ||
    v.includes('default-product')
  ) {
    return DEFAULT_AVATAR;
  }
  return v;
}
