"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Activity page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-black p-8">
      <Card className="border-red-500/30 bg-zinc-900/80 max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            Activity error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Something went wrong loading the activity feed. This can happen after a schema or
            backend change. Try again or go to the dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={reset} className="w-full">
              Try again
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
