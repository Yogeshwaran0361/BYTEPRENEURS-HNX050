import { OlderAdult, ServiceResponse, TodayMedicationItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_OLDER_ADULT } from './mock/devSeedData';
import { medicationSchedulerService } from './engine/medicationSchedulerService';
import { alertEngineService } from './engine/alertEngineService';
import { authService } from './authService';
import { smsService } from './smsService';

export interface SeniorService {
  getProfile(adultId?: string): Promise<ServiceResponse<OlderAdult>>;
  updateProfile(adultId: string, updates: Partial<OlderAdult>): Promise<ServiceResponse<OlderAdult>>;
  getTodaySchedule(adultId?: string): Promise<ServiceResponse<TodayMedicationItem[]>>;
  confirmMedicationTaken(scheduleId: string, medicineId: string, notes?: string): Promise<ServiceResponse<{ recordedAt: string; delayMinutes?: number; alreadyConfirmed?: boolean }>>;
  postponeReminder(scheduleId: string, medicineId: string, minutes: number): Promise<ServiceResponse<{ newTime: string }>>;
  recordReminderDelayed(scheduleId: string, medicineId: string, reason?: string): Promise<ServiceResponse<{ delayedAt: string; delayMinutes: number }>>;
  requestSupport(adultId?: string, medicineId?: string, medicineName?: string, reason?: string): Promise<ServiceResponse<{ notifiedCaregiver: string; message: string }>>;
}

async function resolveOlderAdultId(providedId?: string): Promise<string | null> {
  if (providedId && providedId !== 'dev-adult-1' && !providedId.startsWith('profile-')) {
    return providedId;
  }
  if (!supabase) return providedId || null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return providedId || null;
  const { data: adult } = await supabase
    .from('older_adults')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  return adult?.id || providedId || null;
}

class SeniorServiceImpl implements SeniorService {
  private adultProfile: OlderAdult = { ...DEV_OLDER_ADULT };

  constructor() {
    const saved = localStorage.getItem('nestcare_senior_profile');
    if (saved) {
      try {
        this.adultProfile = JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
  }

  async getProfile(adultId?: string): Promise<ServiceResponse<OlderAdult>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = await resolveOlderAdultId(adultId);
        let query = supabase.from('older_adults').select('*, profile:profiles(*)');

        if (resolvedId) {
          query = query.eq('id', resolvedId);
        }

        const { data, error } = await query.maybeSingle();
        if (error || !data) {
          return { data: null, error: error?.message || 'Older adult profile not found' };
        }

        return { data: data as OlderAdult, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to retrieve senior profile' };
      }
    }
    const currentAdult = (await authService.getCurrentOlderAdult()).data;
    if (currentAdult && (!adultId || currentAdult.id === adultId || currentAdult.profile_id === adultId)) {
      return { data: currentAdult, error: null };
    }
    if (adultId) {
      const found = authService.findOlderAdultById(adultId);
      if (found) {
        return { data: found, error: null };
      }
    }
    return { data: { ...this.adultProfile }, error: null };
  }

  async updateProfile(adultId: string, updates: Partial<OlderAdult>): Promise<ServiceResponse<OlderAdult>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = (await resolveOlderAdultId(adultId)) || adultId;
        const { data, error } = await supabase
          .from('older_adults')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', resolvedId)
          .select('*, profile:profiles(*)')
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Failed to update profile' };
        }

        return { data: data as OlderAdult, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to update profile' };
      }
    }

    this.adultProfile = { ...this.adultProfile, ...updates };
    localStorage.setItem('nestcare_senior_profile', JSON.stringify(this.adultProfile));
    return { data: { ...this.adultProfile }, error: null };
  }

  async getTodaySchedule(adultId?: string): Promise<ServiceResponse<TodayMedicationItem[]>> {
    const resolvedId = (await resolveOlderAdultId(adultId)) || 'dev-adult-1';
    return medicationSchedulerService.getTodayEvents(resolvedId);
  }

  async confirmMedicationTaken(
    scheduleId: string,
    medicineId: string,
    notes?: string
  ): Promise<ServiceResponse<{ recordedAt: string; delayMinutes?: number; alreadyConfirmed?: boolean }>> {
    const adultId = (await resolveOlderAdultId(this.adultProfile.id)) || 'dev-adult-1';
    const res = await medicationSchedulerService.confirmMedication(adultId, scheduleId, medicineId, notes);
    if (res.error) {
      return { data: null, error: res.error };
    }
    return {
      data: {
        recordedAt: res.data?.recordedAt || '',
        delayMinutes: res.data?.delayMinutes,
        alreadyConfirmed: res.data?.alreadyConfirmed,
      },
      error: null,
    };
  }

  async postponeReminder(
    scheduleId: string,
    medicineId: string,
    minutes: number
  ): Promise<ServiceResponse<{ newTime: string }>> {
    const adultId = (await resolveOlderAdultId(this.adultProfile.id)) || 'dev-adult-1';
    const res = await medicationSchedulerService.delayReminder(adultId, scheduleId, medicineId, minutes);
    if (res.error) {
      return { data: null, error: res.error };
    }
    return {
      data: { newTime: res.data?.newTime || '' },
      error: null,
    };
  }

  async recordReminderDelayed(
    scheduleId: string,
    medicineId: string,
    reason?: string
  ): Promise<ServiceResponse<{ delayedAt: string; delayMinutes: number }>> {
    const curAdult = (await authService.getCurrentOlderAdult()).data;
    const adultId = (await resolveOlderAdultId(curAdult?.id || this.adultProfile.id)) || 'dev-adult-1';
    const res = await medicationSchedulerService.recordReminderDelayed(
      adultId,
      scheduleId,
      medicineId,
      reason || 'Senior did not respond to medication reminder'
    );
    if (res.data) {
      await alertEngineService.syncAlertsForAdult(adultId);
    }
    return res;
  }

  async requestSupport(
    adultId?: string,
    medicineId = 'med-1',
    medicineName?: string,
    reason?: string
  ): Promise<ServiceResponse<{ notifiedCaregiver: string; message: string }>> {
    const resolvedAdultId = (await resolveOlderAdultId(adultId)) || 'dev-adult-1';
    let caregiverName = this.adultProfile.emergency_contact_name || 'Caregiver';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: conns } = await supabase
          .from('caregiver_connections')
          .select('*, caregiver:caregivers(*, profile:profiles(*))')
          .eq('older_adult_id', resolvedAdultId)
          .eq('status', 'accepted')
          .limit(1);

        if (conns && conns.length > 0 && conns[0].caregiver?.profile?.full_name) {
          caregiverName = conns[0].caregiver.profile.full_name;
        } else {
          const { data: adult } = await supabase
            .from('older_adults')
            .select('emergency_contact_name')
            .eq('id', resolvedAdultId)
            .maybeSingle();
          if (adult?.emergency_contact_name) {
            caregiverName = adult.emergency_contact_name;
          }
        }
      } catch (e) {
        // non-blocking
      }
    }

    const medName = medicineName || 'medication';

    await medicationSchedulerService.requestSupport(
      resolvedAdultId,
      medicineId,
      medName,
      reason || "Senior requested support for current dose."
    );

    // If Supabase is connected, record directly into alerts & support_requests table
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('support_requests').insert({
          older_adult_id: resolvedAdultId,
          medicine_id: medicineId !== 'med-1' ? medicineId : null,
          medicine_name: medName,
          reason: reason || "Senior requested support for current dose.",
          status: 'OPEN',
        });

        await supabase.from('alerts').insert({
          older_adult_id: resolvedAdultId,
          medicine_id: medicineId !== 'med-1' ? medicineId : null,
          type: 'SUPPORT_REQUESTED',
          title: 'Support requested by senior',
          message: medicineName
            ? `Senior requested support regarding ${medicineName}.`
            : 'Senior has requested support with current routine.',
          status: 'OPEN',
          severity: 'urgent',
        });
      } catch (e) {
        // non-blocking
      }
    }

    // Trigger one real SMS dispatch for this support request event
    const seniorDisplayName = this.adultProfile.preferred_name || 'Senior';
    const occKey = `support-${resolvedAdultId}-${Date.now()}:SUPPORT_REQUESTED`;
    smsService.triggerSms({
      olderAdultId: resolvedAdultId,
      eventType: 'SUPPORT_REQUESTED',
      occurrenceKey: occKey,
      seniorName: seniorDisplayName,
      customBody: `NESTCARE SUPPORT: ${seniorDisplayName} has requested assistance. Please check the NESTCARE caregiver portal.`,
    }).catch(() => {});

    const message = medicineName
      ? `A gentle notice was sent to ${caregiverName} regarding ${medicineName}.`
      : `A gentle notice was sent to ${caregiverName} that you need support.`;

    return {
      data: {
        notifiedCaregiver: caregiverName,
        message,
      },
      error: null,
    };
  }
}

export const seniorService = new SeniorServiceImpl();
