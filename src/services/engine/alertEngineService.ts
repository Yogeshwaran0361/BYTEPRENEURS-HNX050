/**
 * Alert Engine Service (Prompt 7)
 * 
 * Flow:
 * Senior medication activity -> Event evaluated -> Attention condition detected -> Alert created
 * Authorized caregiver sees alert -> Caregiver reviews -> Caregiver supports -> Alert resolved
 * 
 * Rules:
 * 1. Alerts generated ONLY from actual medication activity / support events.
 * 2. Strict duplicate prevention: 1 event = 1 alert (keyed by older_adult_id + event ID / log ID).
 * 3. Clear lifecycle: OPEN -> REVIEWED -> RESOLVED.
 * 4. Alert status is independent of medication status (resolving an alert never changes medication history).
 * 5. Authorization: Only alerts for connected older adults are accessible to the caregiver.
 */

import {
  Alert,
  AlertType,
  AlertWorkflowStatus,
  ServiceResponse,
  OlderAdult,
  Medicine,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DEV_ALERTS, DEV_OLDER_ADULT, DEV_MEDICINES } from '../mock/devSeedData';
import { connectionService } from '../connectionService';
import { medicationSchedulerService } from './medicationSchedulerService';
import { medicineService } from '../medicineService';
import { authService } from '../authService';

class AlertEngineServiceImpl {
  private alerts: Alert[] = [...DEV_ALERTS];

  constructor() {
    const saved = localStorage.getItem('nestcare_alert_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.alerts = parsed;
        }
      } catch (e) {
        // fallback
      }
    }
  }

  private persist() {
    localStorage.setItem('nestcare_alert_records', JSON.stringify(this.alerts));
  }

  /**
   * Evaluates routine events across an older adult's schedule and creates alerts idempotently.
   * Prevents duplicate alerts for the same medication occurrence.
   */
  async syncAlertsForAdult(olderAdultId: string): Promise<Alert[]> {
    const scheduleRes = await medicationSchedulerService.getTodayEvents(olderAdultId);
    const todayEvents = scheduleRes.data || [];
    const openRequests = await medicationSchedulerService.getOpenSupportRequests(olderAdultId);

    // 1. Process Support Requests first (Highest priority: SUPPORT_REQUESTED)
    for (const req of openRequests) {
      const alertKey = `alert-supp-${req.id}`;
      let existing = this.alerts.find(a => a.id === alertKey || a.medication_log_id === req.medication_log_id);

      if (!existing) {
        const newAlert: Alert = {
          id: alertKey,
          older_adult_id: olderAdultId,
          medicine_id: req.medicine_id,
          type: 'SUPPORT_REQUESTED',
          title: 'Support requested by senior',
          message: `${req.medicine_name ? `Support requested regarding ${req.medicine_name}.` : 'Senior has requested support with current routine.'}`,
          status: 'OPEN',
          severity: 'urgent',
          created_at: req.created_at,
          pending_minutes: Math.max(0, Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000)),
        };
        this.alerts.unshift(newAlert);
      }
    }

    // 2. Process Routine Events (DELAYED, MISSED, ATTENTION_REQUIRED)
    for (const ev of todayEvents) {
      if (
        ev.status === 'DELAYED' ||
        ev.status === 'MISSED' ||
        ev.status === 'ATTENTION_REQUIRED'
      ) {
        // If there is already an active support request for this medicine, the support request alert takes precedence
        const hasOpenSupport = openRequests.some(r => r.medicine_id === ev.medicineId);
        if (hasOpenSupport && ev.status === 'ATTENTION_REQUIRED') {
          continue;
        }

        // Deterministic ID preventing duplicate generation on repeated renders/refreshes
        const alertId = `alert-${ev.id}`;
        let existing = this.alerts.find(a => a.id === alertId);

        let alertType: AlertType = 'DELAYED';
        let alertTitle = 'Senior Unresponsive: Medication Delayed';
        let alertMessage = `${ev.medicineName} (${ev.dosage}) scheduled for ${ev.scheduledTime} — senior did not respond to medication reminder.`;

        if (ev.status === 'MISSED') {
          alertType = 'MISSED';
          alertTitle = 'Medication activity was not confirmed';
          alertMessage = `${ev.medicineName} (${ev.dosage}) scheduled for ${ev.scheduledTime} was not confirmed.`;
        } else if (ev.status === 'ATTENTION_REQUIRED') {
          alertType = 'ATTENTION_REQUIRED';
          alertTitle = 'Medication activity needs attention';
          alertMessage = `${ev.medicineName} (${ev.dosage}) scheduled for ${ev.scheduledTime} requires attention.`;
        }

        if (!existing) {
          const newAlert: Alert = {
            id: alertId,
            older_adult_id: olderAdultId,
            medicine_id: ev.medicineId,
            schedule_id: ev.scheduleId,
            type: alertType,
            title: alertTitle,
            message: alertMessage,
            status: 'OPEN',
            severity: 'urgent',
            scheduled_time: ev.scheduledTime,
            pending_minutes: ev.delayMinutes || 0,
            created_at: ev.scheduledFor || new Date().toISOString(),
          };
          this.alerts.unshift(newAlert);
        } else {
          // If already existing and still OPEN, update latest pending minutes & type escalation if transitioned
          if (existing.status === 'OPEN') {
            existing.type = alertType;
            existing.title = alertTitle;
            existing.message = alertMessage;
            existing.pending_minutes = ev.delayMinutes || existing.pending_minutes;
          }
        }
      }
    }

    this.persist();
    return this.alerts.filter(a => a.older_adult_id === olderAdultId);
  }

  /**
   * Retrieves all alerts authorized for a specific caregiver.
   * Strict privacy: only returns alerts for older adults connected to this caregiver.
   */
  async getAlertsForCaregiver(
    caregiverId?: string,
    statusFilter?: AlertWorkflowStatus | 'ALL',
    typeFilter?: AlertType | 'ALL'
  ): Promise<ServiceResponse<Alert[]>> {
    try {
      const activeCg = (await authService.getCurrentCaregiver()).data;
      const targetCgId = caregiverId || activeCg?.id;

      // 1. Authorize: fetch connected older adults
      const connsRes = await connectionService.getConnectionsForCaregiver(targetCgId);
      const conns = connsRes.data || [];
      const authorizedAdultIds = conns.map(c => c.older_adult_id);

      // If caregiver has no connected adults, return empty alerts list
      if (authorizedAdultIds.length === 0) {
        return { data: [], error: null };
      }

      if (isSupabaseConfigured && supabase) {
        let query = supabase.from('alerts').select('*, older_adult:older_adults(*), medicine:medicines(*)');
        query = query.in('older_adult_id', authorizedAdultIds);
        if (statusFilter && statusFilter !== 'ALL') {
          query = query.eq('status', statusFilter);
        }
        if (typeFilter && typeFilter !== 'ALL') {
          query = query.eq('type', typeFilter);
        }
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        return { data: (data as Alert[]) || [], error: error?.message ?? null };
      }

      // 2. Synchronize alerts for all connected adults from active routines
      for (const adultId of authorizedAdultIds) {
        await this.syncAlertsForAdult(adultId);
      }

      // 3. Filter strictly by authorized adult IDs
      let results = this.alerts.filter(a => authorizedAdultIds.includes(a.older_adult_id));

      // 4. Hydrate metadata (senior & medicine names)
      results = results.map(alert => {
        const matchingConn = conns.find(c => c.older_adult_id === alert.older_adult_id);
        const older_adult = matchingConn?.older_adult || alert.older_adult || DEV_OLDER_ADULT;
        const medicine = alert.medicine || DEV_MEDICINES.find(m => m.id === alert.medicine_id);
        return {
          ...alert,
          older_adult,
          medicine,
        };
      });

      // 5. Apply status filter
      if (statusFilter && statusFilter !== 'ALL') {
        results = results.filter(a => a.status === statusFilter);
      }

      // 6. Apply type filter
      if (typeFilter && typeFilter !== 'ALL') {
        results = results.filter(a => a.type === typeFilter);
      }

      // 7. Sort by Priority:
      // Priority 1: OPEN items first
      // Priority 2: Priority order: SUPPORT_REQUESTED -> ATTENTION_REQUIRED -> MISSED -> DELAYED
      // Priority 3: Newest / highest pending minutes
      const typeRank: Record<AlertType, number> = {
        SUPPORT_REQUESTED: 1,
        ATTENTION_REQUIRED: 2,
        MISSED: 3,
        DELAYED: 4,
      };

      results.sort((a, b) => {
        if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
        if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;

        const rankA = typeRank[a.type] || 5;
        const rankB = typeRank[b.type] || 5;
        if (rankA !== rankB) return rankA - rankB;

        return (b.pending_minutes || 0) - (a.pending_minutes || 0);
      });

      return { data: results, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to retrieve alerts' };
    }
  }

  /**
   * Caregiver action: Mark alert as REVIEWED.
   * Does NOT alter the underlying medication log.
   */
  async markAlertReviewed(
    alertId: string,
    caregiverId = 'dev-caregiver-1'
  ): Promise<ServiceResponse<Alert>> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('alerts')
          .update({
            status: 'REVIEWED',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', alertId)
          .select('*, older_adult:older_adults(*), medicine:medicines(*)')
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Failed to update alert' };
        }
        return { data: data as Alert, error: null };
      }

      const idx = this.alerts.findIndex(a => a.id === alertId);
      if (idx === -1) {
        return { data: null, error: 'Alert not found' };
      }

      const nowIso = new Date().toISOString();
      this.alerts[idx] = {
        ...this.alerts[idx],
        status: 'REVIEWED',
        reviewed_at: nowIso,
        caregiver_id: caregiverId,
      };

      this.persist();
      return { data: this.alerts[idx], error: null };
    } catch (err: any) {
      return { data: null, error: "We couldn't update this alert. Please try again." };
    }
  }

  /**
   * Caregiver action: Resolve alert.
   * Does NOT alter the underlying medication log.
   */
  async resolveAlert(
    alertId: string,
    caregiverId = 'dev-caregiver-1'
  ): Promise<ServiceResponse<Alert>> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('alerts')
          .update({
            status: 'RESOLVED',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', alertId)
          .select('*, older_adult:older_adults(*), medicine:medicines(*)')
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Failed to resolve alert' };
        }
        return { data: data as Alert, error: null };
      }

      const idx = this.alerts.findIndex(a => a.id === alertId);
      if (idx === -1) {
        return { data: null, error: 'Alert not found' };
      }

      const nowIso = new Date().toISOString();
      this.alerts[idx] = {
        ...this.alerts[idx],
        status: 'RESOLVED',
        resolved_at: nowIso,
        resolved_by_id: caregiverId,
      };

      // If this alert was triggered by a support request, mark that request as resolved too
      if (alertId.startsWith('alert-supp-')) {
        const reqId = alertId.replace('alert-supp-', '');
        await medicationSchedulerService.resolveSupportRequest(reqId);
      }

      this.persist();
      return { data: this.alerts[idx], error: null };
    } catch (err: any) {
      return { data: null, error: "We couldn't resolve this alert. Please try again." };
    }
  }
}

export const alertEngineService = new AlertEngineServiceImpl();
