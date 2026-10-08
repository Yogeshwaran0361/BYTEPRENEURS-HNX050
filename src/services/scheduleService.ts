import { MedicationSchedule, ServiceResponse } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_SCHEDULES } from './mock/devSeedData';

export interface ScheduleService {
  getSchedules(adultId?: string): Promise<ServiceResponse<MedicationSchedule[]>>;
  createSchedule(schedule: Omit<MedicationSchedule, 'id' | 'created_at'>): Promise<ServiceResponse<MedicationSchedule>>;
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

class ScheduleServiceImpl implements ScheduleService {
  private schedules: MedicationSchedule[] = [...DEV_SCHEDULES];

  async getSchedules(adultId?: string): Promise<ServiceResponse<MedicationSchedule[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = await resolveOlderAdultId(adultId);
        let query = supabase.from('medication_schedules').select('*, medicine:medicines(*)');

        if (resolvedId) {
          query = query.eq('older_adult_id', resolvedId);
        }

        const { data, error } = await query;
        if (error) {
          return { data: [], error: error.message };
        }

        return { data: (data || []) as MedicationSchedule[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Failed to retrieve schedules' };
      }
    }

    if (adultId) {
      return { data: this.schedules.filter(s => s.older_adult_id === adultId), error: null };
    }
    return { data: [...this.schedules], error: null };
  }

  async createSchedule(schedule: Omit<MedicationSchedule, 'id' | 'created_at'>): Promise<ServiceResponse<MedicationSchedule>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedAdultId = await resolveOlderAdultId(schedule.older_adult_id);
        const payload = {
          ...schedule,
          older_adult_id: resolvedAdultId || schedule.older_adult_id,
        };
        const { data, error } = await supabase.from('medication_schedules').insert(payload).select().single();
        if (error) {
          return { data: null, error: error.message };
        }
        return { data: data as MedicationSchedule, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to save schedule' };
      }
    }
    const created: MedicationSchedule = {
      ...schedule,
      id: `sched-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.schedules.push(created);
    return { data: created, error: null };
  }
}

export const scheduleService = new ScheduleServiceImpl();
