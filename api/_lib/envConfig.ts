// api/_lib/envConfig.ts
// Single source of truth for required environment variables.
// Provides strict runtime validation for payment and webhook flows.

/**
 * Required environment variables for payment flow.
 * These must be set in Vercel Production/Preview environments.
 */
export const REQUIRED_PAYMENT_ENV_VARS = [
  'PAYMONGO_SECRET_KEY',
  'APP_BASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64',
  'FIREBASE_DATABASE_URL',
] as const;

/**
 * Required environment variables for webhook flow.
 * These must be set in Vercel Production/Preview environments.
 */
export const REQUIRED_WEBHOOK_ENV_VARS = [
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_WEBHOOK_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64',
  'FIREBASE_DATABASE_URL',
] as const;

/**
 * Required environment variables for monitor/diagnostics endpoint.
 */
export const REQUIRED_MONITOR_ENV_VARS = [
  'PAYMONGO_MONITOR_KEY',
  'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64',
  'FIREBASE_DATABASE_URL',
] as const;

/**
 * All payment-related environment variables (union of all flows).
 * Used for comprehensive diagnostics.
 */
export const ALL_PAYMENT_ENV_VARS = [
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_WEBHOOK_SECRET',
  'PAYMONGO_MONITOR_KEY',
  'APP_BASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64',
  'FIREBASE_DATABASE_URL',
] as const;

export type PaymentEnvVar = (typeof ALL_PAYMENT_ENV_VARS)[number];

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Validates that all required environment variables are set.
 * Returns a result object with validation status and missing variables.
 * NEVER logs or returns actual secret values.
 */
export function validateEnvVars(requiredVars: readonly string[]): EnvValidationResult {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    // eslint-disable-next-line expo/no-dynamic-env-var
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Returns a safe error response for missing environment variables.
 * Labels the error with an actionable code and message.
 * NEVER includes actual secret values.
 */
export function getMissingEnvResponse(missing: string[]): {
  error: string;
  code: string;
  missing: string[];
  action: string;
} {
  return {
    error: 'Server configuration incomplete',
    code: 'ENV_VARS_MISSING',
    missing,
    action: 'Set the listed environment variables in Vercel dashboard and redeploy.',
  };
}

/**
 * Check if a specific environment variable is set (boolean only, no values).
 */
export function hasEnvVar(varName: string): boolean {
  // eslint-disable-next-line expo/no-dynamic-env-var
  const value = process.env[varName];
  return Boolean(value && value.trim() !== '');
}

/**
 * Returns a readiness checklist for all payment-related environment variables.
 * Only returns boolean flags, never actual values.
 */
export function getEnvReadinessChecklist(): Record<PaymentEnvVar, boolean> {
  const checklist: Record<string, boolean> = {};

  for (const varName of ALL_PAYMENT_ENV_VARS) {
    checklist[varName] = hasEnvVar(varName);
  }

  return checklist as Record<PaymentEnvVar, boolean>;
}

/**
 * Returns detailed readiness report for diagnostics endpoint.
 */
export function getReadinessReport(): {
  allReady: boolean;
  checklist: Record<PaymentEnvVar, boolean>;
  missingCount: number;
  missingVars: string[];
} {
  const checklist = getEnvReadinessChecklist();
  const missingVars = ALL_PAYMENT_ENV_VARS.filter((v) => !checklist[v]);

  return {
    allReady: missingVars.length === 0,
    checklist,
    missingCount: missingVars.length,
    missingVars,
  };
}
