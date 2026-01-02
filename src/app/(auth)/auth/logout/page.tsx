import type { Metadata } from 'next';
import LogoutPage from '@/features/auth/LogoutPage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Log out | ${BRAND_NAME}`,
  description: `End your ${BRAND_NAME} session.`,
};

export default function LogoutRoutePage() {
  return <LogoutPage />;
}
