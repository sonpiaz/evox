/**
 * EVOX Design System Components
 * Central export for all EVOX-specific components
 *
 * @see docs/COMPONENT-LIBRARY.md for usage examples
 * @see docs/DESIGN-SYSTEM.md for design tokens
 */

// ============================================
// STATUS & INDICATORS
// ============================================
export { StatusDot, getStatusColor, normalizeStatus } from "./StatusDot";
export { StatusBadge } from "./StatusBadge";
export { AgentStatusIndicator } from "./AgentStatusIndicator";
export { TrendBadge } from "./TrendBadge";

// ============================================
// CARDS & CONTAINERS
// ============================================
export { AgentCard, extractKeywords, generateSummary } from "./AgentCard";
export { MetricCard, MetricInline } from "./MetricCard";
export { Panel, PanelSection } from "./Panel";
export { DailyNoteCard } from "./DailyNoteCard";
export { PredictionCard } from "./PredictionCard";

// ============================================
// CONTENT & DISPLAY
// ============================================
export { Keyword, KeywordList } from "./Keyword";
export { EmptyState, EmptyStateInline } from "./EmptyState";
export { Loading, LoadingPage, Skeleton, SkeletonCard } from "./Loading";
export { CompletionBar } from "./CompletionBar";

// ============================================
// FEEDS & LISTS
// ============================================
export { ActivityFeed } from "./ActivityFeed";
export { AgentActivityFeed } from "./AgentActivityFeed";
export { CommunicationLog } from "./CommunicationLog";
export { AgentCommunicationFeed } from "./AgentCommunicationFeed";
export { DailyNotesList } from "./DailyNotesList";
export { DispatchQueue } from "./DispatchQueue";

// ============================================
// NAVIGATION & CONTROLS
// ============================================
export { ViewTabs } from "./ViewTabs";
export { KillSwitch } from "./KillSwitch";
export { BudgetAlert } from "./BudgetAlert";

// ============================================
// PANELS & WIDGETS
// ============================================
export { HeartbeatPanel } from "./HeartbeatPanel";
export { WorkingMemoryPanel } from "./WorkingMemoryPanel";
export { SoulPreview } from "./SoulPreview";
export { MemoryTab } from "./MemoryTab";
export { DMPanel } from "./DMPanel";
export { ExecutionPanel } from "./ExecutionPanel";
export { AnalyticsPanelV2 } from "./AnalyticsPanelV2";
export { SystemHealthWidget } from "./SystemHealthWidget";
export { AgentMetricsWidget } from "./AgentMetricsWidget";
export { CostWidget } from "./CostWidget";
export { AgentBreakdown } from "./AgentBreakdown";

// ============================================
// CHARTS & VISUALIZATIONS
// ============================================
export { VelocityChart } from "./VelocityChart";
export { CostBarChart } from "./CostBarChart";
export { FileActivityMatrix } from "./FileActivityMatrix";

// ============================================
// FORMS & INPUT
// ============================================
export { DMInput } from "./DMInput";
export { DMList } from "./DMList";
export { DMMessage } from "./DMMessage";
export { MarkdownEditor } from "./MarkdownEditor";
export { ScratchPad } from "./ScratchPad";
export { CommentThreadV2 } from "./CommentThreadV2";

// ============================================
// MODALS & OVERLAYS
// ============================================
export { AgentSettingsModal } from "./AgentSettingsModal";
export { ShortcutsHelpModal } from "./ShortcutsHelpModal";

// ============================================
// LAYOUT & NAVIGATION
// ============================================
export { AgentSidebar } from "./AgentSidebar";
export { AgentTerminals } from "./AgentTerminals";
export { ExecutionTerminal } from "./ExecutionTerminal";
export { DirectMessagesView } from "./DirectMessagesView";

// ============================================
// DASHBOARDS (Full Page)
// ============================================
export { CEODashboard } from "./CEODashboard";
export { SimpleCEODashboard } from "./SimpleCEODashboard";
export { LiveDashboard } from "./LiveDashboard";
export { ElonDashboard } from "./ElonDashboard";
export { CostDashboard } from "./CostDashboard";
export { HealthDashboard } from "./HealthDashboard";
export { AutomationDashboard } from "./AutomationDashboard";

// ============================================
// REDESIGN COMPONENTS (Mobile-First)
// ============================================
export * from "./redesign";
