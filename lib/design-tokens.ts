/**
 * EVOX Design System — Design Tokens
 * AGT-333: Dashboard Redesign Phase 1
 *
 * Single source of truth for colors, spacing, typography.
 * CSS variables defined in app/globals.css mirror these values.
 */

export const colors = {
  bg: {
    primary: "#0a0a0a",
    secondary: "#1a1a1a",
    tertiary: "#2a2a2a",
  },
  text: {
    primary: "#e5e5e5",
    secondary: "#a3a3a3",
    tertiary: "#666666",
  },
  status: {
    online: "#10b981",
    offline: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  },
  accent: {
    primary: "#3b82f6",
    hover: "#2563eb",
  },
  agent: {
    max: "#8B5CF6",
    sam: "#3B82F6",
    leo: "#10B981",
    quinn: "#F59E0B",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
} as const;

export const typography = {
  h1: { size: "48px", weight: 700, lineHeight: 1.2 },
  h2: { size: "32px", weight: 700, lineHeight: 1.3 },
  h3: { size: "24px", weight: 600, lineHeight: 1.4 },
  body: { size: "16px", weight: 400, lineHeight: 1.5 },
  caption: { size: "14px", weight: 400, lineHeight: 1.4 },
  label: { size: "12px", weight: 500, lineHeight: 1.3 },
} as const;

export const breakpoints = {
  mobile: "640px",
  tablet: "1024px",
  desktop: "1280px",
} as const;

export const animation = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
} as const;
