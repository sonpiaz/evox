"use client";

import { TaskDetail } from "@/components/task-detail";
import { TaskActivitySidebar } from "@/components/task-activity-sidebar";

// Mock data
const mockTask = {
  id: "agt-70",
  title: "Build task detail page with activity sidebar",
  status: "in_progress" as const,
  priority: "p2" as const,
  assignee: {
    name: "Leo",
    avatar: "LO",
    color: "purple" as const,
  },
  description: `Create a comprehensive task detail page with the following components:

- Task metadata (status, priority, assignee)
- Full description section
- Activity timeline sidebar
- Comments/messaging interface

The page should follow the Linear-inspired dark theme and provide a clean, focused view of task information.`,
  labels: ["frontend", "ui", "phase-1"],
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
};

const mockMessages = [
  {
    id: "1",
    agentName: "Sam",
    agentAvatar: "SM",
    agentColor: "green" as const,
    content: "Hey Leo, can you add the breadcrumb navigation to this page? Dashboard > Tasks > [Title]",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: "2",
    agentName: "Leo",
    agentAvatar: "LO",
    agentColor: "purple" as const,
    content: "Sure thing! I'll add it to the header component.\n\nAlso planning to add the message thread in the Comments tab.",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: "3",
    agentName: "Max",
    agentAvatar: "MX",
    agentColor: "blue" as const,
    content: "Looking good! Make sure the status dropdown is functional for the demo.",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

const mockActivities = [
  {
    _id: "1",
    agent: {
      name: "Leo",
      avatar: "LO",
      role: "frontend" as const,
      status: "online" as const,
    },
    action: "changed status from",
    target: "Todo to In Progress",
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    _id: "2",
    agent: {
      name: "Sam",
      avatar: "SM",
      role: "pm" as const,
      status: "online" as const,
    },
    action: "assigned to",
    target: "Leo",
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    _id: "3",
    agent: {
      name: "Sam",
      avatar: "SM",
      role: "pm" as const,
      status: "online" as const,
    },
    action: "created task",
    target: "AGT-70",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

export default function TaskDetailPage() {
  const handleStatusChange = (status: "backlog" | "todo" | "in_progress" | "done") => {
    console.log("Status changed to:", status);
    // TODO: Wire up Convex mutation when available
  };

  const handleSendMessage = (message: string) => {
    console.log("Send message:", message);
    // TODO: Wire up Convex mutation when available
  };

  return (
    <div className="flex h-full bg-black">
      {/* Left: Task Detail (60%) */}
      <div className="w-3/5">
        <TaskDetail
          {...mockTask}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Right: Activity Sidebar (40%) */}
      <div className="w-2/5">
        <TaskActivitySidebar
          messages={mockMessages}
          activities={mockActivities}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
