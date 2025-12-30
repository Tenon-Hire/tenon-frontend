import type { Metadata } from 'next';
import LoginPage from '@/features/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Recruiter login | SimuHire',
  description: 'Sign in to access your SimuHire dashboard.',
};

export default function LoginRoutePage() {
  return <LoginPage />;
}
