"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

/**
 * AGT-108: AGENTS.md Registry Display (Operating Manual)
 * Displays shared AGENTS.md content. Fetches from settings (key: agents_md).
 * When agentMemory supports type "agents_md", switch to api.agentMemory.getByType.
 */
export default function RegistryPage() {
  const agentsMdContent = useQuery(api.settings.get, { key: "agents_md" });
  const content = typeof agentsMdContent === "string" ? agentsMdContent : null;

  return (
    <div className="h-full bg-black p-8">
      <div className="mx-auto max-w-4xl">
        <div className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-semibold text-zinc-50 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-zinc-400" />
            Agent Registry (AGENTS.md)
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Shared operating manual — read-only
          </p>
        </div>

        <Card className="mt-6 border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-50 text-lg">Operating Manual</CardTitle>
          </CardHeader>
          <CardContent>
            {content ? (
              <div className="prose prose-invert prose-zinc max-w-none prose-headings:text-zinc-50 prose-p:text-zinc-300 prose-li:text-zinc-300 prose-code:text-zinc-200 prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700 rounded-lg p-4">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">
                AGENTS.md not yet loaded. Add content via Settings (key: agents_md) or seed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
