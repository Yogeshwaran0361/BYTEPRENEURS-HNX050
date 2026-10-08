import { MedicationLog, MedicationStatus, ServiceResponse } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_LOGS, DEV_MEDICINES } from './mock/devSeedData';

export type HistoryFilterRange = 'today' | '7days' | '30days';

export interface MedicationLogService {
  getLogs(adultId?: string, filter?: HistoryFilterRange): Promise<ServiceResponse<MedicationLog[]>>;
  recordLog(log: Omit<MedicationLog, 'id' | 'created_at'>): Promise<ServiceResponse<MedicationLog>>;
  updateLog(logId: string, updates: Partial<MedicationLog>): Promise<ServiceResponse<MedicationLog>>;
}

async function resolveOlderAdultId(providedId?: string): Promise<string | null> {
  if (providedId === 'all') return 'all';
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

class MedicationLogServiceImpl implements MedicationLogService {
  private logs: MedicationLog[] = [
    ...DEV_LOGS,
    // Realistic past records for 7 days / 30 days review
    {
      id: 'log-yesterday-1',
      schedule_id: 'sched-1',
      medicine_id: 'med-1',
      older_adult_id: 'dev-adult-1',
      scheduled_for: new Date(Date.now() - 86400000).toISOString(),
      confirmed_at: new Date(Date.now() - 86400000 + 300000).toISOString(),
      taken_at: new Date(Date.now() - 86400000 + 300000).toISOString(),
      delay_minutes: 5,
      status: 'TAKEN',
      notes: 'Morning dose confirmed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      medicine: DEV_MEDICINES[0],
    },
    {
      id: 'log-yesterday-2',
      schedule_id: 'sched-2',
      medicine_id: 'med-2',
      older_adult_id: 'dev-adult-1',
      scheduled_for: new Date(Date.now() - 86400000).toISOString(),
      confirmed_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
      taken_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
      delay_minutes: 60,
      status: 'TAKEN',
      notes: 'Evening dose confirmed after dinner',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      medicine: DEV_MEDICINES[1],
    },
    {
      id: 'log-3days-ago',
      schedule_id: 'sched-1',
      medicine_id: 'med-1',
      older_adult_id: 'dev-adult-1',
      scheduled_for: new Date(Date.now() - 86400000 * 3).toISOString(),
      confirmed_at: new Date(Date.now() - 86400000 * 3 + 600000).toISOString(),
      taken_at: new Date(Date.now() - 86400000 * 3 + 600000).toISOString(),
      delay_minutes: 10,
      status: 'TAKEN',
      notes: 'Confirmed on time',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      medicine: DEV_MEDICINES[0],
    },
  ];

  constructor() {
    const saved = localStorage.getItem('nestcare_medication_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.logs = parsed;
        }
      } catch (e) {
        // fallback
      }
    }
  }

  private persist() {
    localStorage.setItem('nestcare_medication_logs', JSON.stringify(this.logs));
  }

  async getLogs(_adultId?: string, filter: HistoryFilterRange = 'today'): Promise<ServiceResponse<MedicationLog[]>> {
    if (isSupabaseConfigured && supabase) {
      const resolvedId = await resolveOlderAdultId(_adultId);
      let query = supabase
        .from('medication_logs')
        .select('*, medicine:medicines(*), schedule:medication_schedules(*)')
        .order('created_at', { ascending: false });

      if (resolvedId && resolvedId !== 'all') {
        query = query.eq('older_adult_id', resolvedId);
      }

      const now = new Date();
      if (filter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (filter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (filter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      }

      const { data, error } = await query;
      return { data, error: error?.message ?? null };
    }

    const now = Date.now();
    let filtered = [...this.logs];

    if (_adultId && _adultId !== 'all') {
      filtered = filtered.filter(l => l.older_adult_id === _adultId);
    }

    if (filter === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      filtered = filtered.filter(l => new Date(l.created_at).getTime() >= todayStart);
    } else if (filter === '7days') {
      filtered = filtered.filter(l => new Date(l.created_at).getTime() >= now - 7 * 86400000);
    } else if (filter === '30days') {
      filtered = filtered.filter(l => new Date(l.created_at).getTime() >= now - 30 * 86400000);
    }

    return { data: filtered, error: null };
  }

  async recordLog(log: Omit<MedicationLog, 'id' | 'created_at'>): Promise<ServiceResponse<MedicationLog>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedAdultId = await resolveOlderAdultId(log.older_adult_id);
        const payload = {
          ...log,
          older_adult_id: resolvedAdultId || log.older_adult_id,
        };
        const { data, error } = await supabase.from('medication_logs').insert(payload).select().single();
        return { data, error: error?.message ?? null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to record medication log' };
      }
    }
    const created: MedicationLog = {
      ...log,
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.logs.unshift(created);
    this.persist();
    return { data: created, error: null };
  }

  async updateLog(logId: string, updates: Partial<MedicationLog>): Promise<ServiceResponse<MedicationLog>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('medication_logs').update(updates).eq('id', logId).select().single();
      return { data, error: error?.message ?? null };
    }
    const idx = this.logs.findIndex(l => l.id === logId);
    if (idx >= 0) {
      this.logs[idx] = {
        ...this.logs[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      this.persist();
      return { data: this.logs[idx], error: null };
    }
    return { data: null, error: 'Medication log not found' };
  }
}

export const medicationLogService = new MedicationLogServiceImpl();
