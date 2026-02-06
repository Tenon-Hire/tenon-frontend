import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/server/backendProxy/proxy';
import type { BackendRouteContext } from '@/lib/server/backendProxy/target';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export function GET(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function HEAD(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function POST(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function PUT(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function PATCH(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function DELETE(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
export function OPTIONS(req: NextRequest, context: BackendRouteContext) {
  return proxyToBackend(req, context);
}
