import { MessageBubble } from "@/components/message-bubble";

interface Message {
  id: string;
  agentName: string;
  agentAvatar: string;
  agentColor: "blue" | "green" | "purple";
  content: string;
  timestamp: Date;
}

interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-tertiary">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          agentName={message.agentName}
          agentAvatar={message.agentAvatar}
          agentColor={message.agentColor}
          content={message.content}
          timestamp={message.timestamp}
        />
      ))}
    </div>
  );
}
