"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  _id: string;
  name: string;
  role: string;
  status: string;
  avatar: string;
}

const roleColors: Record<string, string> = {
  pm: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  backend: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  frontend: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusDotColors: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-red-500",
};

export default function AgentsPage() {
  const agents = useQuery(api.agents.list);

  return (
    <div className="h-full bg-black p-8">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-50">Agents</h1>
        <p className="text-sm text-zinc-500">Manage your AI agent team — tap for Memory & Boot Status</p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents && agents.length > 0 ? (
          agents.map((agent: Agent) => (
            <Link key={agent._id} href={`/agents/${agent._id}`}>
              <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-zinc-800">
                      <AvatarFallback className="bg-zinc-800 text-zinc-50">
                        {agent.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900",
                        statusDotColors[agent.status] ?? "bg-gray-500"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-50 truncate">{agent.name}</h3>
                    <Badge
                      variant="outline"
                      className={cn("text-xs mt-1", roleColors[agent.role] ?? "")}
                    >
                      {agent.role}
                    </Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-zinc-400 col-span-full">No agents yet. Run seed.</p>
        )}
      </div>
    </div>
  );
}
