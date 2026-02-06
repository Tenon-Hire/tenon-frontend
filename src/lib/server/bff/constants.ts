import { BRAND_SLUG } from '@/lib/brand';

export const UPSTREAM_HEADER = `x-${BRAND_SLUG}-upstream-status`;
export const REQUEST_ID_HEADER = 'x-tenon-request-id';
export const DEBUG_PERF = process.env.TENON_DEBUG_PERF;
export const USE_FETCH_DISPATCHER =
  process.env.TENON_USE_FETCH_DISPATCHER === '1' ||
  process.env.TENON_USE_FETCH_DISPATCHER === 'true';
