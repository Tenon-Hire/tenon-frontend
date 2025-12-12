import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";

export default function LogoutPageContent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <PageHeader
          title="Log out"
          subtitle="Are you sure you want to log out of SimuHire?"
        />

        <div className="rounded-lg border px-6 py-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <a href="/auth/logout" className="block">
              <Button
                type="button"
                className="w-full justify-center text-base font-medium"
              >
                Yes, log me out
              </Button>
            </a>

            <Link href="/dashboard" className="block">
              <Button
                type="button"
                className="w-full justify-center border border-gray-300 bg-white text-base font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            This will end your SimuHire session and redirect you back to the app.
          </p>
        </div>
      </div>
    </main>
  );
}
