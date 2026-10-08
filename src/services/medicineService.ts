import { Medicine, ServiceResponse } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_MEDICINES } from './mock/devSeedData';
import { authService } from './authService';

export interface MedicineService {
  getMedicines(adultId?: string, filter?: 'all' | 'active' | 'paused', search?: string): Promise<ServiceResponse<Medicine[]>>;
  getMedicineById(medicineId: string): Promise<ServiceResponse<Medicine>>;
  createMedicine(medicine: Omit<Medicine, 'id' | 'created_at'>): Promise<ServiceResponse<Medicine>>;
  updateMedicine(medicineId: string, updates: Partial<Medicine>): Promise<ServiceResponse<Medicine>>;
  pauseMedicine(medicineId: string): Promise<ServiceResponse<Medicine>>;
  resumeMedicine(medicineId: string): Promise<ServiceResponse<Medicine>>;
  archiveMedicine(medicineId: string): Promise<ServiceResponse<boolean>>;
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

class MedicineServiceImpl implements MedicineService {
  private medicines: Medicine[] = [...DEV_MEDICINES];

  constructor() {
    const saved = localStorage.getItem('nestcare_medicines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.medicines = parsed;
        }
      } catch (e) {
        // fallback
      }
    }
  }

  private persist() {
    localStorage.setItem('nestcare_medicines', JSON.stringify(this.medicines));
  }

  async getMedicines(
    adultId?: string,
    filter: 'all' | 'active' | 'paused' = 'all',
    search = ''
  ): Promise<ServiceResponse<Medicine[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const targetAdultId = await resolveOlderAdultId(adultId);
        let query = supabase.from('medicines').select('*');

        if (targetAdultId) {
          query = query.eq('older_adult_id', targetAdultId);
        }

        if (filter === 'active') {
          query = query.eq('active', true);
        } else if (filter === 'paused') {
          query = query.eq('active', false);
        }

        if (search.trim()) {
          query = query.ilike('name', `%${search.trim()}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) {
          return { data: [], error: error.message };
        }

        // Map to typed Medicine entity
        const mapped = (data || []).map(m => ({
          ...m,
          is_active: m.active ?? m.is_active ?? true,
          type: m.medicine_type || m.type || 'Tablet',
          scheduled_times: m.scheduled_times || [],
        })) as Medicine[];

        return { data: mapped, error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Failed to retrieve medicines' };
      }
    }

    const currentAdult = (await authService.getCurrentOlderAdult()).data;
    const targetId = adultId || currentAdult?.id || 'dev-adult-1';
    let results = this.medicines.filter(m => m.older_adult_id === targetId);

    if (filter === 'active') {
      results = results.filter(m => m.is_active);
    } else if (filter === 'paused') {
      results = results.filter(m => !m.is_active);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        m => m.name.toLowerCase().includes(q) || (m.generic_name && m.generic_name.toLowerCase().includes(q))
      );
    }

    return { data: [...results], error: null };
  }

  async getMedicineById(medicineId: string): Promise<ServiceResponse<Medicine>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('id', medicineId)
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Medicine not found' };
        }

        const mapped: Medicine = {
          ...data,
          is_active: data.active ?? data.is_active ?? true,
          type: data.medicine_type || data.type || 'Tablet',
          scheduled_times: data.scheduled_times || [],
        };

        return { data: mapped, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to retrieve medicine details' };
      }
    }

    const found = this.medicines.find(m => m.id === medicineId);
    return { data: found || null, error: found ? null : 'Medicine not found' };
  }

  async createMedicine(medicine: Omit<Medicine, 'id' | 'created_at'>): Promise<ServiceResponse<Medicine>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedAdultId = await resolveOlderAdultId(medicine.older_adult_id);
        if (!resolvedAdultId) {
          return { data: null, error: 'Could not resolve older adult identifier' };
        }

        const payload = {
          older_adult_id: resolvedAdultId,
          name: medicine.name.trim(),
          generic_name: medicine.generic_name?.trim() || null,
          medicine_type: medicine.type || 'Tablet',
          type: medicine.type || 'Tablet',
          dosage: medicine.dosage.trim(),
          amount_per_dose: medicine.amount_per_dose?.trim() || null,
          frequency: medicine.frequency || 'Once a day',
          scheduled_times: medicine.scheduled_times || [],
          food_relation: medicine.food_relation || 'Any time',
          instructions: medicine.additional_instructions || medicine.instructions || null,
          additional_instructions: medicine.additional_instructions || medicine.instructions || null,
          prescribed_by: medicine.prescribed_by?.trim() || null,
          pharmacy: medicine.pharmacy?.trim() || null,
          start_date: medicine.start_date || new Date().toISOString().split('T')[0],
          end_date: medicine.end_date || null,
          active: medicine.is_active ?? true,
          is_active: medicine.is_active ?? true,
        };

        const { data, error } = await supabase.from('medicines').insert(payload).select().single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Failed to save medicine' };
        }

        // Auto-create schedules for each specified scheduled_time
        if (Array.isArray(medicine.scheduled_times) && medicine.scheduled_times.length > 0) {
          for (const timeStr of medicine.scheduled_times) {
            await supabase.from('medication_schedules').insert({
              medicine_id: data.id,
              older_adult_id: resolvedAdultId,
              scheduled_time: timeStr,
              frequency: medicine.frequency || 'Once a day',
              schedule_label: `${data.name} dose`,
              is_active: true,
            });
          }
        }

        const createdMed: Medicine = {
          ...data,
          is_active: data.active ?? data.is_active ?? true,
          type: data.medicine_type || data.type || 'Tablet',
          scheduled_times: data.scheduled_times || [],
        };

        return { data: createdMed, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Could not save medicine' };
      }
    }

    const created: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.medicines.unshift(created);
    this.persist();
    return { data: created, error: null };
  }

  async updateMedicine(medicineId: string, updates: Partial<Medicine>): Promise<ServiceResponse<Medicine>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: any = { ...updates, updated_at: new Date().toISOString() };
        if (updates.is_active !== undefined) {
          payload.active = updates.is_active;
        }
        if (updates.type !== undefined) {
          payload.medicine_type = updates.type;
        }

        const { data, error } = await supabase
          .from('medicines')
          .update(payload)
          .eq('id', medicineId)
          .select()
          .single();

        if (error || !data) {
          return { data: null, error: error?.message || 'Failed to update medicine' };
        }

        const mapped: Medicine = {
          ...data,
          is_active: data.active ?? data.is_active ?? true,
          type: data.medicine_type || data.type || 'Tablet',
          scheduled_times: data.scheduled_times || [],
        };

        return { data: mapped, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to update medicine' };
      }
    }

    const index = this.medicines.findIndex(m => m.id === medicineId);
    if (index === -1) return { data: null, error: 'Medicine not found' };
    this.medicines[index] = {
      ...this.medicines[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return { data: this.medicines[index], error: null };
  }

  async pauseMedicine(medicineId: string): Promise<ServiceResponse<Medicine>> {
    return this.updateMedicine(medicineId, { is_active: false });
  }

  async resumeMedicine(medicineId: string): Promise<ServiceResponse<Medicine>> {
    return this.updateMedicine(medicineId, { is_active: true });
  }

  async archiveMedicine(medicineId: string): Promise<ServiceResponse<boolean>> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Preserve historical logs by archiving/deactivating rather than destructive delete
        const { error } = await supabase
          .from('medicines')
          .update({ active: false, is_active: false, updated_at: new Date().toISOString() })
          .eq('id', medicineId);
        return { data: !error, error: error?.message ?? null };
      } catch (err: any) {
        return { data: false, error: err?.message || 'Failed to archive medicine' };
      }
    }
    this.medicines = this.medicines.filter(m => m.id !== medicineId);
    this.persist();
    return { data: true, error: null };
  }
}

export const medicineService = new MedicineServiceImpl();
