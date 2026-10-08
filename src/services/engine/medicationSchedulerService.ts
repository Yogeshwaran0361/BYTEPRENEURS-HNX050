/**
 * Medication Scheduler Service (Prompt 5)
 * 
 * Responsible for:
 * 1. Generating or retrieving MedicationSchedule entries from stored Medicines.
 * 2. Evaluating active schedules against date boundaries (start_date, end_date, is_active).
 * 3. Daily Event Generation: producing distinct medication occurrences for today.
 * 4. Merging with stored MedicationLogs and SupportRequests to produce accurate TodayMedicationItem lists.
 * 5. Idempotent confirmation, duplicate protection, and postpone reminder management.
 */

import {
  Medicine,
  MedicationSchedule,
  MedicationLog,
  SupportRequest,
  TodayMedicationItem,
  ServiceResponse,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { medicineService } from '../medicineService';
import { scheduleService } from '../scheduleService';
import { medicationLogService } from '../medicationLogService';
import { MedicationStatusEngine } from './medicationStatusEngine';
import {
  parseTimeString,
  formatTime12h,
  formatLocalDateString,
  getTimeOfDayCategory,
  buildDeterministicEventKey,
} from './medicationStatusConfig';
import { DEV_SCHEDULES } from '../mock/devSeedData';

class MedicationSchedulerServiceImpl {
  private schedules: MedicationSchedule[] = [...DEV_SCHEDULES];
  private supportRequests: SupportRequest[] = [];

  constructor() {
    const savedSchedules = localStorage.getItem('nestcare_medication_schedules');
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.schedules = parsed;
        }
      } catch (e) {
        // fallback
      }
    }

    const savedRequests = localStorage.getItem('nestcare_support_requests');
    if (savedRequests) {
      try {
        const parsed = JSON.parse(savedRequests);
        if (Array.isArray(parsed)) {
          this.supportRequests = parsed;
        }
      } catch (e) {
        // fallback
      }
    }
  }

  private persistSchedules() {
    localStorage.setItem('nestcare_medication_schedules', JSON.stringify(this.schedules));
  }

  private persistSupportRequests() {
    localStorage.setItem('nestcare_support_requests', JSON.stringify(this.supportRequests));
  }

  /**
   * Synchronizes schedules for all medicines of an older adult.
   * Ensures each scheduled_time on each active medicine has a corresponding MedicationSchedule.
   */
  async ensureSchedulesForMedicines(olderAdultId: string): Promise<MedicationSchedule[]> {
    const res = await medicineService.getMedicines(olderAdultId, 'all');
    const medicines = res.data || [];

    const activeSchedules: MedicationSchedule[] = [];

    for (const med of medicines) {
      // If medicine is inactive/paused, do NOT create new active schedules
      const times = med.scheduled_times && med.scheduled_times.length > 0
        ? med.scheduled_times
        : ['09:00 AM'];

      times.forEach((timeStr, idx) => {
        const parsed = parseTimeString(timeStr);
        const timeKey = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
        const scheduleId = `sched-${med.id}-${idx}`;

        // Find or build schedule
        let existing = this.schedules.find(s => s.id === scheduleId || (s.medicine_id === med.id && s.scheduled_time === timeKey));
        if (!existing) {
          existing = {
            id: scheduleId,
            medicine_id: med.id,
            older_adult_id: olderAdultId,
            scheduled_time: timeKey,
            time_of_day: getTimeOfDayCategory(parsed.hour),
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            start_date: med.start_date,
            end_date: med.end_date || null,
            food_instruction: 'no_restriction',
            is_active: med.is_active,
            created_at: med.created_at || new Date().toISOString(),
            medicine: med,
          };
          this.schedules.push(existing);
        } else {
          // Sync active flag with medicine
          existing.is_active = med.is_active;
          existing.start_date = med.start_date;
          existing.end_date = med.end_date || null;
          existing.medicine = med;
        }

        activeSchedules.push(existing);
      });
    }

    this.persistSchedules();
    return activeSchedules;
  }

  /**
   * Checks whether a schedule is valid on a specific target date
   * Date boundary rules: respects start_date, end_date, and is_active flag.
   */
  isScheduleValidOnDate(schedule: MedicationSchedule, targetDate: Date): boolean {
    if (!schedule.is_active) return false;

    const targetDateStr = formatLocalDateString(targetDate);

    // Check start_date
    if (schedule.start_date) {
      const startStr = schedule.start_date.slice(0, 10);
      if (targetDateStr < startStr) return false;
    }

    // Check end_date
    if (schedule.end_date) {
      const endStr = schedule.end_date.slice(0, 10);
      if (targetDateStr > endStr) return false;
    }

    return true;
  }

  /**
   * Generates and evaluates today's scheduled medication items.
   * Daily Event Generation: produces separate events for each scheduled occurrence.
   */
  async getTodayEvents(olderAdultId: string, referenceTime: Date = new Date()): Promise<ServiceResponse<TodayMedicationItem[]>> {
    try {
      let adultSchedules: MedicationSchedule[] = [];

      if (isSupabaseConfigured && supabase) {
        const schedRes = await scheduleService.getSchedules(olderAdultId);
        adultSchedules = schedRes.data || [];
        if (adultSchedules.length === 0) {
          // If no schedules exist in medication_schedules table, derive directly from active medicines
          const medRes = await medicineService.getMedicines(olderAdultId, 'all');
          const medicines = medRes.data || [];
          for (const med of medicines) {
            const times = med.scheduled_times && med.scheduled_times.length > 0
              ? med.scheduled_times
              : ['09:00 AM'];
            times.forEach((timeStr, idx) => {
              const parsed = parseTimeString(timeStr);
              const timeKey = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
              adultSchedules.push({
                id: `sched-${med.id}-${idx}`,
                medicine_id: med.id,
                older_adult_id: olderAdultId,
                scheduled_time: timeKey,
                time_of_day: getTimeOfDayCategory(parsed.hour),
                days_of_week: [0, 1, 2, 3, 4, 5, 6],
                start_date: med.start_date,
                end_date: med.end_date || null,
                food_instruction: 'no_restriction',
                is_active: med.is_active,
                created_at: med.created_at || new Date().toISOString(),
                medicine: med,
              });
            });
          }
        }
      } else {
        await this.ensureSchedulesForMedicines(olderAdultId);
        adultSchedules = this.schedules.filter(
          s => s.older_adult_id === olderAdultId
        );
      }

      // Fetch today's existing logs from medicationLogService
      const logsRes = await medicationLogService.getLogs(olderAdultId, 'today');
      const todayLogs = logsRes.data || [];

      // Fetch open support requests
      const openRequests = this.supportRequests.filter(
        r => r.older_adult_id === olderAdultId && r.status === 'OPEN'
      );

      const todayStr = formatLocalDateString(referenceTime);
      const items: TodayMedicationItem[] = [];

      for (const schedule of adultSchedules) {
        // Date boundaries: paused medicine & date span checks
        if (!this.isScheduleValidOnDate(schedule, referenceTime)) {
          continue;
        }

        const parsedTime = parseTimeString(schedule.scheduled_time);
        const scheduledDate = new Date(referenceTime);
        scheduledDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

        const scheduledIso = scheduledDate.toISOString();
        const eventKey = buildDeterministicEventKey(schedule.id, scheduledIso);

        // Find matching medication log for this specific event occurrence (by schedule + scheduled_for date)
        const matchingLog = todayLogs.find(
          l => l.schedule_id === schedule.id ||
            (l.medicine_id === schedule.medicine_id && l.scheduled_for.slice(0, 16) === scheduledIso.slice(0, 16))
        );

        // Find matching support request
        const matchingRequest = openRequests.find(
          r => r.medication_log_id === matchingLog?.id || r.medicine_id === schedule.medicine_id
        );

        // Evaluate status using centralized status engine
        const evaluation = MedicationStatusEngine.evaluateEvent({
          scheduledFor: scheduledDate,
          log: matchingLog,
          supportRequest: matchingRequest,
          now: referenceTime,
        });

        const medicine = schedule.medicine;

        const item: TodayMedicationItem = {
          id: matchingLog?.id || eventKey,
          scheduleId: schedule.id,
          medicineId: schedule.medicine_id,
          medicineName: medicine?.name || 'Medication',
          dosage: medicine?.dosage || 'Prescribed dose',
          amountPerDose: medicine?.amount_per_dose,
          scheduledTime: formatTime12h(parsedTime.hour, parsedTime.minute),
          scheduledFor: scheduledIso,
          timeOfDay: schedule.time_of_day || getTimeOfDayCategory(parsedTime.hour),
          foodInstruction: schedule.food_instruction,
          foodRelation: medicine?.food_relation,
          instructions: medicine?.additional_instructions || medicine?.instructions,
          status: evaluation.status,
          logId: matchingLog?.id,
          confirmedAt: matchingLog?.confirmed_at || matchingLog?.taken_at,
          takenAt: matchingLog?.confirmed_at || matchingLog?.taken_at
            ? formatTime12h(new Date(matchingLog.confirmed_at || matchingLog.taken_at!))
            : undefined,
          delayMinutes: evaluation.delayMinutes,
          remindAt: matchingLog?.remind_at,
          needsAttentionReason: evaluation.reason,
        };

        items.push(item);
      }

      // Sort chronologically by scheduled time
      items.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

      return { data: items, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Error generating daily events' };
    }
  }

  /**
   * Idempotent confirmation: Records confirmation for a scheduled event.
   * If already TAKEN, protects against duplicate confirmation and returns existing confirmation info.
   */
  async confirmMedication(
    olderAdultId: string,
    scheduleId: string,
    medicineId: string,
    notes?: string
  ): Promise<ServiceResponse<{ recordedAt: string; delayMinutes: number; logId: string; alreadyConfirmed?: boolean }>> {
    try {
      const now = new Date();
      const logsRes = await medicationLogService.getLogs(olderAdultId, 'today');
      const todayLogs = logsRes.data || [];

      // Schedule retrieval
      let schedule = this.schedules.find(s => s.id === scheduleId);
      if (!schedule && isSupabaseConfigured && supabase) {
        const { data: dbSched } = await supabase
          .from('medication_schedules')
          .select('*')
          .eq('id', scheduleId)
          .maybeSingle();
        if (dbSched) {
          schedule = dbSched as MedicationSchedule;
        }
      }

      const parsedTime = schedule ? parseTimeString(schedule.scheduled_time) : { hour: 9, minute: 0 };
      const scheduledDate = new Date(now);
      scheduledDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
      const scheduledIso = scheduledDate.toISOString();

      // Check existing log for duplicate protection
      const existing = todayLogs.find(
        l => l.schedule_id === scheduleId ||
          (l.medicine_id === medicineId && l.scheduled_for.slice(0, 16) === scheduledIso.slice(0, 16))
      );

      if (existing && existing.status === 'TAKEN') {
        const confirmedDate = new Date(existing.confirmed_at || existing.taken_at || existing.created_at);
        return {
          data: {
            recordedAt: formatTime12h(confirmedDate),
            delayMinutes: existing.delay_minutes || 0,
            logId: existing.id,
            alreadyConfirmed: true,
          },
          error: null,
        };
      }

      // Delay calculation
      const delayMinutes = MedicationStatusEngine.calculateDelayMinutes(scheduledDate, now);
      const recordedAtStr = formatTime12h(now);

      if (existing) {
        // Update existing log
        existing.status = 'TAKEN';
        existing.confirmed_at = now.toISOString();
        existing.taken_at = now.toISOString();
        existing.delay_minutes = delayMinutes;
        existing.notes = notes || existing.notes;
        existing.updated_at = now.toISOString();
        // Clear snooze
        delete existing.remind_at;

        // Persist through log service
        await medicationLogService.updateLog(existing.id, {
          status: 'TAKEN',
          confirmed_at: existing.confirmed_at,
          taken_at: existing.taken_at,
          delay_minutes: delayMinutes,
          notes: existing.notes,
        });

        return {
          data: {
            recordedAt: recordedAtStr,
            delayMinutes,
            logId: existing.id,
          },
          error: null,
        };
      }

      // Create new medication log record
      const newLog = await medicationLogService.recordLog({
        schedule_id: scheduleId,
        medicine_id: medicineId,
        older_adult_id: olderAdultId,
        scheduled_for: scheduledIso,
        status: 'TAKEN',
        confirmed_at: now.toISOString(),
        taken_at: now.toISOString(),
        delay_minutes: delayMinutes,
        notes: notes || 'Confirmed by senior on time',
        updated_at: now.toISOString(),
      });

      return {
        data: {
          recordedAt: recordedAtStr,
          delayMinutes,
          logId: newLog.data?.id || `log-${Date.now()}`,
        },
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: "We couldn't record the confirmation. Please check your connection and try again.",
      };
    }
  }

  /**
   * Postpones reminder for an existing scheduled event (Remind Me Later).
   * Modifies reminder state without duplicating records.
   */
  async delayReminder(
    olderAdultId: string,
    scheduleId: string,
    medicineId: string,
    minutes: number
  ): Promise<ServiceResponse<{ newTime: string; remindAt: string }>> {
    try {
      const now = new Date();
      const remindAtDate = new Date(now.getTime() + minutes * 60000);
      const newTime = formatTime12h(remindAtDate);

      const logsRes = await medicationLogService.getLogs(olderAdultId, 'today');
      const todayLogs = logsRes.data || [];

      const schedule = this.schedules.find(s => s.id === scheduleId);
      const parsedTime = schedule ? parseTimeString(schedule.scheduled_time) : { hour: 9, minute: 0 };
      const scheduledDate = new Date(now);
      scheduledDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

      const existing = todayLogs.find(l => l.schedule_id === scheduleId);

      if (existing) {
        await medicationLogService.updateLog(existing.id, {
          remind_at: remindAtDate.toISOString(),
        });
      } else {
        await medicationLogService.recordLog({
          schedule_id: scheduleId,
          medicine_id: medicineId,
          older_adult_id: olderAdultId,
          scheduled_for: scheduledDate.toISOString(),
          status: 'UPCOMING',
          remind_at: remindAtDate.toISOString(),
          notes: `Postponed by ${minutes} minutes`,
        });
      }

      return { data: { newTime, remindAt: remindAtDate.toISOString() }, error: null };
    } catch (err: any) {
      return { data: null, error: 'Could not postpone reminder' };
    }
  }

  /**
   * Explicitly marks a medication reminder as DELAYED (senior not responding to reminder/alarm).
   */
  async recordReminderDelayed(
    olderAdultId: string,
    scheduleId: string,
    medicineId: string,
    reason = 'Senior did not respond to medication reminder'
  ): Promise<ServiceResponse<{ delayedAt: string; delayMinutes: number }>> {
    try {
      const now = new Date();
      const logsRes = await medicationLogService.getLogs(olderAdultId, 'today');
      const todayLogs = logsRes.data || [];

      let schedule = this.schedules.find(s => s.id === scheduleId);
      if (!schedule && isSupabaseConfigured && supabase) {
        const { data: dbSched } = await supabase
          .from('medication_schedules')
          .select('*')
          .eq('id', scheduleId)
          .maybeSingle();
        if (dbSched) schedule = dbSched as MedicationSchedule;
      }

      const parsedTime = schedule ? parseTimeString(schedule.scheduled_time) : { hour: 9, minute: 0 };
      const scheduledDate = new Date(now);
      scheduledDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
      const scheduledIso = scheduledDate.toISOString();
      const delayMinutes = Math.max(1, MedicationStatusEngine.calculateDelayMinutes(scheduledDate, now));

      const existing = todayLogs.find(
        l => l.schedule_id === scheduleId ||
          (l.medicine_id === medicineId && l.scheduled_for && l.scheduled_for.slice(0, 16) === scheduledIso.slice(0, 16))
      );

      if (existing) {
        if (existing.status !== 'TAKEN') {
          existing.status = 'DELAYED';
          existing.delay_minutes = delayMinutes;
          existing.notes = reason;
          existing.updated_at = now.toISOString();

          await medicationLogService.updateLog(existing.id, {
            status: 'DELAYED',
            delay_minutes: delayMinutes,
            notes: reason,
          });
        }
      } else {
        await medicationLogService.recordLog({
          schedule_id: scheduleId,
          medicine_id: medicineId,
          older_adult_id: olderAdultId,
          scheduled_for: scheduledIso,
          status: 'DELAYED',
          delay_minutes: delayMinutes,
          notes: reason,
          updated_at: now.toISOString(),
        });
      }

      return {
        data: {
          delayedAt: formatTime12h(now),
          delayMinutes,
        },
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || 'Could not record delayed reminder',
      };
    }
  }

  /**
   * Escalates support request ("I Can't Take This Now" or caregiver assistance).
   */
  async requestSupport(
    olderAdultId: string,
    medicineId: string,
    medicineName: string,
    reason = "Senior selected 'I Can't Take This Now'"
  ): Promise<ServiceResponse<SupportRequest>> {
    try {
      const supportReq: SupportRequest = {
        id: `supp-${Date.now()}`,
        older_adult_id: olderAdultId,
        medicine_id: medicineId,
        medicine_name: medicineName,
        reason,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      };

      this.supportRequests.push(supportReq);
      this.persistSupportRequests();

      // Also ensure log reflects ATTENTION_REQUIRED status
      const logsRes = await medicationLogService.getLogs(olderAdultId, 'today');
      const existing = (logsRes.data || []).find(l => l.medicine_id === medicineId);

      if (existing) {
        await medicationLogService.updateLog(existing.id, {
          status: 'ATTENTION_REQUIRED',
          notes: reason,
        });
      } else {
        await medicationLogService.recordLog({
          schedule_id: `sched-${medicineId}-0`,
          medicine_id: medicineId,
          older_adult_id: olderAdultId,
          scheduled_for: new Date().toISOString(),
          status: 'ATTENTION_REQUIRED',
          notes: reason,
        });
      }

      return { data: supportReq, error: null };
    } catch (err: any) {
      return { data: null, error: 'Failed to record support request' };
    }
  }

  async getOpenSupportRequests(olderAdultId: string): Promise<SupportRequest[]> {
    return this.supportRequests.filter(r => r.older_adult_id === olderAdultId && r.status === 'OPEN');
  }

  async resolveSupportRequest(requestId: string): Promise<void> {
    const req = this.supportRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'RESOLVED';
      this.persistSupportRequests();
    }
  }
}

export const medicationSchedulerService = new MedicationSchedulerServiceImpl();
