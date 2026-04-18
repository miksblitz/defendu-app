/** Aligns with dashboard weekly goal limits. */
export const DEFAULT_DAILY_MODULE_GOAL = 5;
export const DEFAULT_WEEKLY_MODULE_GOAL = 7;

export function clampDailyModuleTarget(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DAILY_MODULE_GOAL;
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function clampWeeklyModuleTarget(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_WEEKLY_MODULE_GOAL;
  return Math.max(3, Math.min(20, Math.round(n)));
}

export function clampTrainingDaysPerWeek(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(7, Math.round(n)));
}

export function clampTrainingProgramWeeks(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.max(1, Math.min(52, Math.round(n)));
}

/** Weekly module goal shown on the dashboard: days × modules/day, clamped to app limits. */
export function computeWeeklyModuleTargetFromSchedule(
  dailyModuleTarget: number,
  trainingDaysPerWeek: number
): number {
  const d = clampDailyModuleTarget(dailyModuleTarget);
  const days = clampTrainingDaysPerWeek(trainingDaysPerWeek);
  return clampWeeklyModuleTarget(d * days);
}
