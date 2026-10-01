import type { RiskLevel } from '../../security/src/risk.js';

export type PolicyDecision = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
};

export function decide(risk: RiskLevel, confirmMedium = false): PolicyDecision {
  if (risk === 'critical') {
    return { allowed: false, requiresConfirmation: false, reason: 'CRITICAL_BLOCKED' };
  }
  if (risk === 'high') {
    return { allowed: false, requiresConfirmation: true, reason: 'HIGH_REQUIRES_CONFIRMATION' };
  }
  if (risk === 'medium' && !confirmMedium) {
    return { allowed: false, requiresConfirmation: true, reason: 'MEDIUM_REQUIRES_CONFIRMATION' };
  }
  return { allowed: true, requiresConfirmation: false, reason: 'POLICY_ALLOWED' };
}
