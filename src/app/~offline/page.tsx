import Link from "next/link";
import { Activity, WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline",
  description: "You are currently offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 grid size-20 place-content-center rounded-[24px] bg-muted">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re Offline</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        Please check your internet connection and try again. Any pending changes
        will sync automatically when you&apos;re back online.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-[16px] bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition hover:translate-y-[-1px]"
      >
        <Activity className="h-4 w-4" />
        Try Dashboard
      </Link>
    </main>
  );
}
