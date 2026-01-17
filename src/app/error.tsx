'use client';

import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center text-gray-900">
          <div className="max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-xl font-semibold">Something went wrong</div>
            <p className="text-sm text-gray-700">
              We hit an unexpected error while loading this page. Try refreshing
              or head back to the previous screen.
            </p>
            {error?.message ? (
              <p className="rounded bg-gray-100 px-3 py-2 text-xs text-gray-700">
                {error.message}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => reset()}>Retry</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
