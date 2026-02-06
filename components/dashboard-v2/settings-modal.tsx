"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * AGT-230: Settings Modal — hidden in demo mode
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { isViewerMode } = useViewerMode();
  const { toast } = useToast();
  const settings = useQuery(api.settings.getAll);
  const updateSetting = useMutation(api.settings.set);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [eventToggles, setEventToggles] = useState({
    taskCreated: true,
    taskAssigned: true,
    taskCompleted: true,
    statusChanged: true,
  });

  useEffect(() => {
    if (settings) {
      setWebhookUrl(settings.slackWebhookUrl || "");
      setEventToggles({
        taskCreated: settings.slackEventTaskCreated ?? true,
        taskAssigned: settings.slackEventTaskAssigned ?? true,
        taskCompleted: settings.slackEventTaskCompleted ?? true,
        statusChanged: settings.slackEventStatusChanged ?? true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting({ key: "slackWebhookUrl", value: webhookUrl });
      await updateSetting({ key: "slackEventTaskCreated", value: eventToggles.taskCreated });
      await updateSetting({ key: "slackEventTaskAssigned", value: eventToggles.taskAssigned });
      await updateSetting({ key: "slackEventTaskCompleted", value: eventToggles.taskCompleted });
      await updateSetting({ key: "slackEventStatusChanged", value: eventToggles.statusChanged });
      toast({ title: "Settings saved", description: "Slack integration settings have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({ title: "No webhook URL", description: "Please enter a webhook URL first.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🧪 Test message from EVOX Mission Control",
          blocks: [{ type: "section", text: { type: "mrkdwn", text: "*EVOX Test*\nSlack integration working." } }],
        }),
      });
      if (res.ok) toast({ title: "Test successful", description: "Check your Slack channel." });
      else toast({ title: "Test failed", description: `Status ${res.status}`, variant: "destructive" });
    } catch {
      toast({ title: "Test failed", description: "Check webhook URL.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  // AGT-230: Don't render modal in demo mode
  if (!open || isViewerMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800 bg-base" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-primary">Settings</h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-800 hover:text-white" aria-label="Close">×</button>
        </div>
        <div className="p-4">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-primary">Slack Integration</CardTitle>
              </div>
              <CardDescription className="text-secondary">Configure webhook and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="text-primary">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input id="webhookUrl" type="url" placeholder="https://hooks.slack.com/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1 border-gray-700 bg-gray-800 text-gray-100" />
                  <Button variant="outline" onClick={handleTest} disabled={isTesting || !webhookUrl} className="border-gray-700">{isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}</Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-primary">Notification Events</Label>
                {[
                  { key: "taskCreated" as const, label: "Task Created" },
                  { key: "taskAssigned" as const, label: "Task Assigned" },
                  { key: "taskCompleted" as const, label: "Task Completed" },
                  { key: "statusChanged" as const, label: "Status Changed" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 p-3">
                    <p className="text-sm font-medium text-primary">{label}</p>
                    <Switch checked={eventToggles[key]} onCheckedChange={(c) => setEventToggles((t) => ({ ...t, [key]: c }))} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
