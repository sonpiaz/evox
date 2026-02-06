"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

const STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-700",
  delivered: "bg-blue-100 text-blue-700",
  seen: "bg-green-100 text-green-700",
  replied: "bg-purple-100 text-purple-700",
} as const;

const STATUS_ICONS = {
  pending: "⏳",
  delivered: "📬",
  seen: "👁️",
  replied: "💬",
} as const;

export default function MessagesPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>("max");

  // Get all conversations
  const conversations = useQuery(api.messageStatus.getAllConversations, { limit: 100 });

  // Get sent messages with status
  const sentMessages = useQuery(api.messageStatus.getSentMessagesWithStatus, {
    fromAgent: selectedAgent,
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Message Status Dashboard
          </h1>
          <p className="text-gray-600">
            View message delivery status with read receipts
          </p>
        </div>

        {/* Agent Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View messages from:
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="max">MAX</option>
            <option value="sam">SAM</option>
            <option value="leo">LEO</option>
            <option value="evox">EVOX</option>
            <option value="ceo">CEO</option>
          </select>
        </div>

        {/* Sent Messages Summary */}
        {sentMessages && (
          <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Sent Messages Summary
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {sentMessages.messages.length}
                </div>
                <div className="text-sm text-blue-600">Total Sent</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {sentMessages.messages.filter((m) => m.status >= 2).length}
                </div>
                <div className="text-sm text-green-600">Seen</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {sentMessages.messages.filter((m) => m.status >= 3).length}
                </div>
                <div className="text-sm text-purple-600">Replied</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {sentMessages.messages.filter((m) => m.status < 2).length}
                </div>
                <div className="text-sm text-gray-600">Unread</div>
              </div>
            </div>

            {/* By Recipient */}
            <div>
              <h3 className="text-lg font-medium mb-3">By Recipient</h3>
              <div className="space-y-2">
                {sentMessages.byRecipient.map((recipient) => (
                  <div
                    key={recipient.recipient}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {recipient.recipient}
                      </div>
                      <div className="text-sm text-gray-500">
                        {recipient.messageCount} messages
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">
                        {recipient.unreadCount} unread
                      </span>
                      <span className="text-gray-600">
                        {recipient.unrepliedCount} unreplied
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Messages */}
        {sentMessages && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Messages</h2>
            <div className="space-y-3">
              {sentMessages.messages.slice(0, 20).map((msg) => (
                <div
                  key={msg._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        To: {msg.to}
                      </span>
                      {msg.priority === "urgent" && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        STATUS_COLORS[msg.statusLabel as keyof typeof STATUS_COLORS]
                      }`}
                    >
                      {STATUS_ICONS[msg.statusLabel as keyof typeof STATUS_ICONS]}{" "}
                      {msg.statusLabel}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{msg.content}</p>

                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>
                      Sent:{" "}
                      {new Date(msg.sentAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.seenAt && (
                      <span>
                        Seen:{" "}
                        {new Date(msg.seenAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {msg.repliedAt && (
                      <span>
                        Replied:{" "}
                        {new Date(msg.repliedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Conversations */}
        {conversations && conversations.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">All Conversations</h2>
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.conversationKey}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">
                      {conv.participants[0]} ↔ {conv.participants[1]}
                    </div>
                    <div className="flex gap-2 text-sm text-gray-600">
                      <span>{conv.messageCount} messages</span>
                      {conv.unseenCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                          {conv.unseenCount} unseen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {conv.lastMessage.from} → {conv.lastMessage.to}:
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                          STATUS_COLORS[
                            conv.lastMessage.statusLabel as keyof typeof STATUS_COLORS
                          ]
                        }`}
                      >
                        {
                          STATUS_ICONS[
                            conv.lastMessage.statusLabel as keyof typeof STATUS_ICONS
                          ]
                        }
                      </span>
                    </div>
                    <p className="text-gray-500">{conv.lastMessage.content}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(conv.lastMessage.sentAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
