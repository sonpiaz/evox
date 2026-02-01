"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ListTodo, MessageSquare, Activity, Calendar, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "@/components/project-selector";
import { useProject } from "@/components/project-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Standup", href: "/standup", icon: Calendar },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Registry", href: "/registry", icon: BookOpen },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { selectedProjectId, setSelectedProjectId } = useProject();

  return (
    <div className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-semibold text-zinc-50">EVOX</h1>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Project Selector */}
      <div className="py-2">
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
      </div>

      <Separator className="bg-zinc-800" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-4">
        <p className="text-xs text-zinc-500">Mission Control v1.0</p>
      </div>
    </div>
  );
}
