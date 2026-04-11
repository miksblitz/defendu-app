/**
 * In-memory flag: first time the user starts training in this app session (JS runtime),
 * show safety protocol. Any module they pick first gets safety; later starts skip it.
 */
let trainingSafetyAcknowledgedThisSession = false;

export function shouldShowTrainingSafetyFirst(): boolean {
  return !trainingSafetyAcknowledgedThisSession;
}

export function markTrainingSafetyAcknowledged(): void {
  trainingSafetyAcknowledgedThisSession = true;
}
