/**
 * Shared layout constants & responsive helpers used across screens.
 */

/** Breakpoints (min-width). */
export const Breakpoints = {
  /** Mobile phones */
  mobile: 0,
  /** Large phones / small tablets */
  tablet: 768,
  /** Desktop / wide tablets */
  desktop: 1024,
  /** Large desktop */
  wide: 1440,
} as const;

export type BreakpointKey = keyof typeof Breakpoints;

/** Given a screen width, return the current breakpoint key. */
export function getBreakpoint(width: number): BreakpointKey {
  if (width >= Breakpoints.wide) return 'wide';
  if (width >= Breakpoints.desktop) return 'desktop';
  if (width >= Breakpoints.tablet) return 'tablet';
  return 'mobile';
}

/** Sidebar width per breakpoint. 0 = hidden (use hamburger). */
export function getSidebarWidth(width: number): number {
  if (width >= Breakpoints.tablet) return 80;
  return 0; // mobile: sidebar collapses to hamburger
}

/** Number of module‑card columns to show at this width. */
export function getModuleColumns(width: number): number {
  if (width >= Breakpoints.wide) return 4;
  if (width >= Breakpoints.desktop) return 3;
  if (width >= Breakpoints.tablet) return 2;
  return 2;
}

/** Standard spacing scale. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Standard border‑radius scale. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;
