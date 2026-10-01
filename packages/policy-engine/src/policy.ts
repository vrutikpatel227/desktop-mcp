import type { RiskLevel } from '../../security/src/risk.js';

export type PolicyDecision = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
};

export function decide(risk: RiskLevel, confirmed = false): PolicyDecision {
  if (risk === 'critical') {
    return { allowed: false, requiresConfirmation: false, reason: 'CRITICAL_BLOCKED' };
  }
  if (risk === 'high') {
    return confirmed
      ? { allowed: true, requiresConfirmation: false, reason: 'HIGH_CONFIRMED' }
      : { allowed: false, requiresConfirmation: true, reason: 'HIGH_REQUIRES_CONFIRMATION' };
  }
  if (risk === 'medium') {
    return confirmed
      ? { allowed: true, requiresConfirmation: false, reason: 'MEDIUM_CONFIRMED' }
      : { allowed: false, requiresConfirmation: true, reason: 'MEDIUM_REQUIRES_CONFIRMATION' };
  }
  return { allowed: true, requiresConfirmation: false, reason: 'POLICY_ALLOWED' };
}
