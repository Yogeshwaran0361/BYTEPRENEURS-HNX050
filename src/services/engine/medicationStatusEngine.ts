/**
 * Centralized Medication Status Engine (Prompt 5)
 * 
 * Evaluates medication events deterministically based on:
 * - scheduled time
 * - current time
 * - confirmation state
 * - reminder state
 * - configured thresholds
 * - support request escalation
 * 
 * Workflow state machine:
 * UPCOMING -> DUE -> TAKEN
 * or:
 * UPCOMING -> DUE -> DELAYED -> MISSED -> ATTENTION_REQUIRED
 * or:
 * DUE -> I CAN'T TAKE THIS NOW -> ATTENTION_REQUIRED
 */

import { MedicationStatus, MedicationLog, TodayMedicationItem, SupportRequest } from '../../types';
import { DEFAULT_ENGINE_CONFIG, MedicationEngineConfig } from './medicationStatusConfig';

export interface EventEvaluationInput {
  scheduledFor: string | Date;
  log?: MedicationLog | null;
  supportRequest?: SupportRequest | null;
  now?: Date;
  config?: MedicationEngineConfig;
}

export interface EvaluatedStatusResult {
  status: MedicationStatus;
  isConfirmed: boolean;
  isDue: boolean;
  isDelayed: boolean;
  isMissed: boolean;
  isUpcoming: boolean;
  needsAttention: boolean;
  reason?: string;
  delayMinutes: number;
}

export class MedicationStatusEngine {
  /**
   * Pure evaluation function for a single medication event
   */
  static evaluateEvent(input: EventEvaluationInput): EvaluatedStatusResult {
    const now = input.now || new Date();
    const config = input.config || DEFAULT_ENGINE_CONFIG;
    const scheduledTime = typeof input.scheduledFor === 'string'
      ? new Date(input.scheduledFor)
      : input.scheduledFor;

    const log = input.log;
    const supportReq = input.supportRequest;

    // 1. If already confirmed as TAKEN, historical status is preserved permanently
    if (log && log.status === 'TAKEN') {
      const confirmedTime = log.confirmed_at || log.taken_at
        ? new Date(log.confirmed_at || log.taken_at!)
        : scheduledTime;
      const delayMinutes = log.delay_minutes !== undefined
        ? log.delay_minutes
        : Math.max(0, Math.round((confirmedTime.getTime() - scheduledTime.getTime()) / 60000));

      return {
        status: 'TAKEN',
        isConfirmed: true,
        isDue: false,
        isDelayed: delayMinutes > 0,
        isMissed: false,
        isUpcoming: false,
        needsAttention: false,
        delayMinutes,
      };
    }

    // 2. If already logged as DELAYED (senior not responding or timed out)
    if (log && log.status === 'DELAYED') {
      const scheduledMs = scheduledTime.getTime();
      const nowMs = now.getTime();
      const delayMinutes = log.delay_minutes !== undefined
        ? log.delay_minutes
        : Math.max(1, Math.round((nowMs - scheduledMs) / 60000));

      return {
        status: 'DELAYED',
        isConfirmed: false,
        isDue: false,
        isDelayed: true,
        isMissed: false,
        isUpcoming: false,
        needsAttention: true,
        reason: log.notes || 'Senior did not respond to medication reminder',
        delayMinutes,
      };
    }

    // 3. Escalation: Explicit support request ("I Can't Take This Now" or open request)
    if (
      (supportReq && supportReq.status === 'OPEN') ||
      (log && log.status === 'ATTENTION_REQUIRED')
    ) {
      return {
        status: 'ATTENTION_REQUIRED',
        isConfirmed: false,
        isDue: false,
        isDelayed: false,
        isMissed: false,
        isUpcoming: false,
        needsAttention: true,
        reason: supportReq?.reason || 'Support requested by senior',
        delayMinutes: 0,
      };
    }

    // 3. Time comparison
    const scheduledMs = scheduledTime.getTime();
    const nowMs = now.getTime();
    const diffMinutes = Math.floor((nowMs - scheduledMs) / 60000);

    // 4. Handle active Remind Me Later state
    if (log && log.remind_at) {
      const remindMs = new Date(log.remind_at).getTime();
      if (nowMs < remindMs) {
        // Snoozed: acts as UPCOMING until reminder time arrives
        return {
          status: 'UPCOMING',
          isConfirmed: false,
          isDue: false,
          isDelayed: false,
          isMissed: false,
          isUpcoming: true,
          needsAttention: false,
          delayMinutes: 0,
        };
      }
      // Reminder time arrived: becomes DUE immediately
    }

    // 5. Time window state machine
    if (diffMinutes < 0) {
      // Scheduled time is in the future
      return {
        status: 'UPCOMING',
        isConfirmed: false,
        isDue: false,
        isDelayed: false,
        isMissed: false,
        isUpcoming: true,
        needsAttention: false,
        delayMinutes: 0,
      };
    }

    if (diffMinutes <= config.dueGracePeriodMinutes) {
      // Inside grace period: prominently DUE
      return {
        status: 'DUE',
        isConfirmed: false,
        isDue: true,
        isDelayed: false,
        isMissed: false,
        isUpcoming: false,
        needsAttention: false,
        delayMinutes: diffMinutes,
      };
    }

    if (diffMinutes <= config.missedThresholdMinutes) {
      // Beyond grace period, within missed threshold: DELAYED
      return {
        status: 'DELAYED',
        isConfirmed: false,
        isDue: false,
        isDelayed: true,
        isMissed: false,
        isUpcoming: false,
        needsAttention: true,
        reason: 'Senior did not respond to medication reminder',
        delayMinutes: diffMinutes,
      };
    }

    // Beyond missed threshold: MISSED -> ATTENTION_REQUIRED escalation
    return {
      status: 'ATTENTION_REQUIRED',
      isConfirmed: false,
      isDue: false,
      isDelayed: false,
      isMissed: true,
      needsAttention: true,
      reason: 'This medication activity needs attention.',
      isUpcoming: false,
      delayMinutes: diffMinutes,
    };
  }

  /**
   * Calculates delay in minutes between scheduled time and confirmation time
   */
  static calculateDelayMinutes(scheduledFor: string | Date, confirmedAt: string | Date): number {
    const sched = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor;
    const conf = typeof confirmedAt === 'string' ? new Date(confirmedAt) : confirmedAt;
    const diffMs = conf.getTime() - sched.getTime();
    if (diffMs <= 0) return 0;
    return Math.round(diffMs / 60000);
  }
}
