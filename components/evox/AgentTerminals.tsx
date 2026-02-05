'use client';

import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  port: number;
  color: string;
}

interface AgentConfig extends Agent {
  tunnelUrl?: string;
}

const AGENTS: AgentConfig[] = [
  { id: 'max', name: 'MAX', role: 'PM', port: 7681, color: '#3B82F6', tunnelUrl: 'https://evox-max.loca.lt' },
  { id: 'sam', name: 'SAM', role: 'Backend', port: 7682, color: '#10B981', tunnelUrl: 'https://evox-sam.loca.lt' },
  { id: 'leo', name: 'LEO', role: 'Frontend', port: 7683, color: '#F59E0B', tunnelUrl: 'https://evox-leo.loca.lt' },
  { id: 'quinn', name: 'QUINN', role: 'QA', port: 7684, color: '#8B5CF6', tunnelUrl: 'https://evox-quinn.loca.lt' },
  { id: 'maya', name: 'MAYA', role: 'Design', port: 7685, color: '#EC4899', tunnelUrl: 'https://evox-maya.loca.lt' },
];

// Base URL for ttyd - will be configured per environment
const getTtydUrl = (agent: AgentConfig) => {
  // For local development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:${agent.port}`;
  }
  // For tunnel access (loca.lt)
  if (agent.tunnelUrl) {
    return agent.tunnelUrl;
  }
  // For remote access via Tailscale (Mac mini)
  return `http://100.106.143.17:${agent.port}`;
};

export function AgentTerminals() {
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖥️</span>
          <h3 className="font-semibold text-white">Agent Terminals</h3>
          <span className="text-xs text-gray-500">(read-only)</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition"
        >
          {isExpanded ? '⬆️ Collapse' : '⬇️ Expand'}
        </button>
      </div>

      {/* Agent Tabs - Scrollable on mobile */}
      <div className="flex overflow-x-auto border-b border-gray-800 scrollbar-hide">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition ${
              selectedAgent?.id === agent.id
                ? 'bg-gray-800 text-white border-b-2'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            style={{
              borderBottomColor: selectedAgent?.id === agent.id ? agent.color : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: agent.color }}
              />
              <span>{agent.name}</span>
              <span className="hidden sm:inline text-xs text-gray-500">({agent.role})</span>
            </div>
          </button>
        ))}
      </div>

      {/* Terminal Iframe - Responsive height */}
      {selectedAgent && (
        <div
          className={`transition-all duration-300 ${
            isExpanded ? 'h-[400px] sm:h-[600px]' : 'h-[200px] sm:h-[300px]'
          }`}
        >
          <iframe
            src={getTtydUrl(selectedAgent)}
            className="w-full h-full border-0 bg-black"
            title={`${selectedAgent.name} Terminal`}
          />
        </div>
      )}

      {/* Empty State */}
      {!selectedAgent && (
        <div className="h-[100px] flex items-center justify-center text-gray-500">
          <p>Click an agent tab to view their terminal</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>💡 Terminals are read-only for safety</span>
        <div className="flex gap-2">
          <a
            href={selectedAgent ? getTtydUrl(selectedAgent) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:text-white transition ${!selectedAgent ? 'opacity-50' : ''}`}
          >
            🔗 Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

export default AgentTerminals;
