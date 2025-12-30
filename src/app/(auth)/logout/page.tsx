import type { Metadata } from 'next';
import LogoutPage from '@/features/auth/LogoutPage';

export const metadata: Metadata = {
  title: 'Log out | SimuHire',
  description: 'End your SimuHire session.',
};

export default function LogoutRoutePage() {
  return <LogoutPage />;
}
