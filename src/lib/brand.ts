export const BRAND_NAME = 'Tenon';
export const BRAND_SLUG = 'tenon';
export const BRAND_DOMAIN = 'tenon.ai';

const RAW_CLAIM_NAMESPACE =
  process.env.NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE?.trim() ||
  `https://${BRAND_DOMAIN}`;

export const CUSTOM_CLAIM_NAMESPACE = RAW_CLAIM_NAMESPACE.endsWith('/')
  ? RAW_CLAIM_NAMESPACE
  : `${RAW_CLAIM_NAMESPACE}/`;

export const CUSTOM_CLAIM_PERMISSIONS = `${CUSTOM_CLAIM_NAMESPACE}permissions`;
export const CUSTOM_CLAIM_PERMISSIONS_STR = `${CUSTOM_CLAIM_NAMESPACE}permissions_str`;
export const CUSTOM_CLAIM_ROLES = `${CUSTOM_CLAIM_NAMESPACE}roles`;
export const CUSTOM_CLAIM_EMAIL = `${CUSTOM_CLAIM_NAMESPACE}email`;
