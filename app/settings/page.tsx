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

export default function SettingsPage() {
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

  // Load settings when they become available
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

      toast({
        title: "Settings saved",
        description: "Slack integration settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({
        title: "No webhook URL",
        description: "Please enter a webhook URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🧪 Test message from EVOX Mission Control",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*EVOX Test Notification*\n\nYour Slack integration is working correctly! 🎉",
              },
            },
          ],
        }),
      });

      if (response.ok) {
        toast({
          title: "Test successful",
          description: "Check your Slack channel for the test message.",
        });
      } else {
        toast({
          title: "Test failed",
          description: `Webhook returned status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test failed",
        description: "Unable to send test message. Check your webhook URL.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-50">Settings</h1>
          <p className="mt-2 text-zinc-400">Manage integrations and notifications</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-zinc-50">Slack Integration</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Configure Slack webhook and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className="text-zinc-200">
                Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={isTesting || !webhookUrl}
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing
                    </>
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Create an incoming webhook in your Slack workspace settings
              </p>
            </div>

            {/* Event Toggles */}
            <div className="space-y-4">
              <Label className="text-zinc-200">Notification Events</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Task Created</p>
                    <p className="text-xs text-zinc-500">Notify when new tasks are created</p>
                  </div>
                  <Switch
                    checked={eventToggles.taskCreated}
                    onCheckedChange={(checked) =>
                      setEventToggles({ ...eventToggles, taskCreated: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Task Assigned</p>
                    <p className="text-xs text-zinc-500">Notify when tasks are assigned to agents</p>
                  </div>
                  <Switch
                    checked={eventToggles.taskAssigned}
                    onCheckedChange={(checked) =>
                      setEventToggles({ ...eventToggles, taskAssigned: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Task Completed</p>
                    <p className="text-xs text-zinc-500">Notify when tasks are marked as done</p>
                  </div>
                  <Switch
                    checked={eventToggles.taskCompleted}
                    onCheckedChange={(checked) =>
                      setEventToggles({ ...eventToggles, taskCompleted: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Status Changed</p>
                    <p className="text-xs text-zinc-500">Notify when task status changes</p>
                  </div>
                  <Switch
                    checked={eventToggles.statusChanged}
                    onCheckedChange={(checked) =>
                      setEventToggles({ ...eventToggles, statusChanged: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
