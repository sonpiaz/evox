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
export { CommunicationLog } from "./CommunicationLog";
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

export { WorkingMemoryPanel } from "./WorkingMemoryPanel";
export { SoulPreview } from "./SoulPreview";
export { MemoryTab } from "./MemoryTab";
export { DMPanel } from "./DMPanel";

// ============================================
// CHARTS & VISUALIZATIONS
// ============================================
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
// ALERTS & NOTIFICATIONS
// ============================================
export { Toast, type ToastProps, type ToastSeverity } from "./Toast";

// ============================================
// MODALS & OVERLAYS
// ============================================
export { AgentSettingsModal } from "./AgentSettingsModal";
export { ShortcutsHelpModal } from "./ShortcutsHelpModal";

// ============================================
// LAYOUT & NAVIGATION
// ============================================
export { ExecutionTerminal } from "./ExecutionTerminal";
export { DirectMessagesView } from "./DirectMessagesView";

// ============================================
// DASHBOARDS (Full Page)
// ============================================
export { CEODashboard } from "./CEODashboard";
export { HallOfFame } from "./HallOfFame";
export { LiveDashboard } from "./LiveDashboard";
export { HealthDashboard } from "./HealthDashboard";
export { AutomationDashboard } from "./AutomationDashboard";

// ============================================
// REDESIGN COMPONENTS (Mobile-First)
// ============================================
export * from "./redesign";
