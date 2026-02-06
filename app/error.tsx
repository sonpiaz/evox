"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 sm:p-8">
      <Card className="border-red-500/30 bg-surface-1/80 max-w-md w-full mx-4" role="alert" aria-live="assertive">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-red-400 text-base sm:text-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <p className="text-xs sm:text-sm text-secondary">
            A client-side error occurred. This can happen after a schema or
            backend change. Try again or go back to the home page.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-tertiary">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={reset} className="w-full">
              Try again
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
