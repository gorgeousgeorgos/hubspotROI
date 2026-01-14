
import { Settings, PlanType } from '../types';

/**
 * Centralized Paywall & Feature Guard Logic
 */

export const isFeatureLocked = (settings: Settings, requiredPlan: PlanType): boolean => {
  if (requiredPlan === 'FREE') return false;
  return settings.subscription.plan !== 'PRO';
};

export const getPlanLimits = (plan: PlanType) => {
  if (plan === 'PRO') {
    return {
      links: Infinity,
      assets: Infinity,
      intelligence: true,
      customDomain: true
    };
  }
  return {
    links: 1,
    assets: 5,
    intelligence: false,
    customDomain: false
  };
};
