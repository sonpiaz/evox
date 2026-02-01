"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const pathname = usePathname();

  // Generate breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.length > 0
    ? segments.map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    : ["Dashboard"];

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">EVOX</span>
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-zinc-600" />
            <span className={i === breadcrumbs.length - 1 ? "text-zinc-50" : "text-zinc-400"}>
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Right side: Notification Bell + User Avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
            SP
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
