import { notFound } from 'next/navigation';

type TokenParams = Promise<{ token?: string }>;

export async function extractToken(params: TokenParams): Promise<string> {
  const resolved = await params;
  const token = resolved?.token?.trim();
  if (!token) notFound();
  return token;
}

export type { TokenParams };
