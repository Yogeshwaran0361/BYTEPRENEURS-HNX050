import { Caregiver, CaregiverConnection, ServiceResponse, Alert } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_CAREGIVER } from './mock/devSeedData';
import { connectionService } from './connectionService';
import { medicationSchedulerService } from './engine/medicationSchedulerService';
import { medicineService } from './medicineService';
import { authService } from './authService';
import { alertService } from './alertService';

export interface CaregiverAttentionItem {
  id: string;
  olderAdultId: string;
  olderAdultName: string;
  olderAdultPhone?: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  status: 'DELAYED' | 'MISSED' | 'ATTENTION_REQUIRED' | 'DUE';
  pendingMinutes: number;
  reason?: string;
  isReviewed?: boolean;
  reviewedAt?: string;
}

export interface CaregiverService {
  getProfile(caregiverId?: string): Promise<ServiceResponse<Caregiver>>;
  getConnectedAdults(caregiverId?: string): Promise<ServiceResponse<CaregiverConnection[]>>;
  connectOlderAdult(caregiverId: string, inviteCode: string, relationship?: string): Promise<ServiceResponse<CaregiverConnection>>;
  getAttentionItems(caregiverId?: string): Promise<ServiceResponse<CaregiverAttentionItem[]>>;
  markItemReviewed(itemId: string): Promise<ServiceResponse<boolean>>;
  verifyAccessToAdult(caregiverId: string, adultId: string): Promise<boolean>;
  updateProfile(updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }): Promise<ServiceResponse<Caregiver>>;
}

class CaregiverServiceImpl implements CaregiverService {
  private caregiverProfile: Caregiver = { ...DEV_CAREGIVER };
  private reviewedAttentionIds: Set<string> = new Set();
  private reviewedAtMap: Record<string, string> = {};

  constructor() {
    const saved = localStorage.getItem('nestcare_reviewed_attention_ids');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          this.reviewedAttentionIds = new Set(arr);
        }
      } catch (e) {
        // fallback
      }
    }
    const savedMeta = localStorage.getItem('nestcare_reviewed_attention_meta');
    if (savedMeta) {
      try {
        this.reviewedAtMap = JSON.parse(savedMeta);
      } catch (e) {
        // fallback
      }
    }
  }

  private persistReviewed() {
    localStorage.setItem(
      'nestcare_reviewed_attention_ids',
      JSON.stringify(Array.from(this.reviewedAttentionIds))
    );
    localStorage.setItem(
      'nestcare_reviewed_attention_meta',
      JSON.stringify(this.reviewedAtMap)
    );
  }

  async getProfile(_caregiverId?: string): Promise<ServiceResponse<Caregiver>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let query = supabase.from('caregivers').select('*, profile:profiles(*)');
        if (_caregiverId && _caregiverId !== 'dev-caregiver-1' && !_caregiverId.startsWith('profile-')) {
          query = query.eq('id', _caregiverId);
        } else if (user) {
          query = query.eq('profile_id', user.id);
        }
        const { data, error } = await query.maybeSingle();
        if (error || !data) {
          return { data: null, error: error?.message || 'Caregiver profile not found' };
        }
        return { data: data as Caregiver, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to retrieve caregiver profile' };
      }
    }
    const currentCgRes = await authService.getCurrentCaregiver();
    if (currentCgRes.data) {
      return { data: currentCgRes.data, error: null };
    }
    return { data: this.caregiverProfile, error: null };
  }

  async updateProfile(updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }): Promise<ServiceResponse<Caregiver>> {
    const res = await authService.updateCaregiverProfile(updates);
    if (res.data) {
      this.caregiverProfile = res.data;
    }
    return res;
  }

  async getConnectedAdults(caregiverId?: string): Promise<ServiceResponse<CaregiverConnection[]>> {
    const activeCg = (await authService.getCurrentCaregiver()).data;
    const resolvedCgId = caregiverId || activeCg?.id;
    return connectionService.getConnectionsForCaregiver(resolvedCgId);
  }

  async verifyAccessToAdult(caregiverId: string | undefined, adultId: string): Promise<boolean> {
    if (!adultId) return false;
    const activeCg = (await authService.getCurrentCaregiver()).data;
    const resolvedCgId = caregiverId || activeCg?.id;
    const connRes = await this.getConnectedAdults(resolvedCgId);
    const conns = connRes.data || [];
    if (conns.some(c => c.older_adult_id === adultId)) {
      return true;
    }
    // Check if the current user themselves is this older adult
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adult } = await supabase.from('older_adults').select('id').eq('profile_id', user.id).maybeSingle();
          if (adult && adult.id === adultId) {
            return true;
          }
        }
      } catch (e) {
        // non-blocking
      }
    }
    return false;
  }

  async connectOlderAdult(
    caregiverId: string | undefined,
    inviteCode: string,
    relationship = 'Caregiver'
  ): Promise<ServiceResponse<CaregiverConnection>> {
    const activeCg = (await authService.getCurrentCaregiver()).data;
    const resolvedCgId = caregiverId || activeCg?.id || '';
    return connectionService.verifyAndConnect(resolvedCgId, inviteCode, relationship);
  }

  /**
   * Derives real attention items across all connected older adults
   * by inspecting today's events, open support requests, and alerts.
   */
  async getAttentionItems(caregiverId?: string): Promise<ServiceResponse<CaregiverAttentionItem[]>> {
    try {
      const connsRes = await this.getConnectedAdults(caregiverId);
      const conns = connsRes.data || [];
      if (conns.length === 0) {
        return { data: [], error: null };
      }
      const attentionList: CaregiverAttentionItem[] = [];

      for (const conn of conns) {
        const adultId = conn.older_adult_id;
        const adultName = conn.older_adult?.preferred_name || conn.older_adult?.profile?.full_name || 'Connected Senior';
        const adultPhone = conn.older_adult?.phone || (conn.older_adult as any)?.emergency_phone || '';

        // 1. Check open support requests
        const openReqs = await medicationSchedulerService.getOpenSupportRequests(adultId);
        for (const req of openReqs) {
          const reqKey = `supp-${req.id}`;
          const isReviewed = this.reviewedAttentionIds.has(reqKey);
          attentionList.push({
            id: reqKey,
            olderAdultId: adultId,
            olderAdultName: adultName,
            olderAdultPhone: adultPhone,
            medicineId: req.medicine_id || '',
            medicineName: req.medicine_name || 'Medication Routine',
            dosage: '',
            scheduledTime: new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'ATTENTION_REQUIRED',
            pendingMinutes: Math.max(0, Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000)),
            reason: req.reason || 'Support requested by senior',
            isReviewed,
            reviewedAt: this.reviewedAtMap[reqKey],
          });
        }

        // 2. Check today's routine events
        const scheduleRes = await medicationSchedulerService.getTodayEvents(adultId);
        const events = scheduleRes.data || [];

        for (const ev of events) {
          if (
            ev.status === 'ATTENTION_REQUIRED' ||
            ev.status === 'DELAYED' ||
            ev.status === 'MISSED' ||
            ev.status === 'DUE'
          ) {
            // Avoid duplicates if there is already a support request for this medicine
            if (openReqs.some(r => r.medicine_id === ev.medicineId)) {
              continue;
            }

            const isReviewed = this.reviewedAttentionIds.has(ev.id);
            const isDelayed = ev.status === 'DELAYED';
            attentionList.push({
              id: ev.id,
              olderAdultId: adultId,
              olderAdultName: adultName,
              olderAdultPhone: adultPhone,
              medicineId: ev.medicineId,
              medicineName: ev.medicineName,
              dosage: ev.dosage,
              scheduledTime: ev.scheduledTime,
              status: isDelayed ? 'DELAYED' : ev.status === 'MISSED' ? 'MISSED' : ev.status === 'DUE' ? 'DUE' : 'ATTENTION_REQUIRED',
              pendingMinutes: ev.delayMinutes || 0,
              reason: ev.needsAttentionReason || (isDelayed ? 'Senior did not respond to medication reminder (delayed)' : ev.status === 'DUE' ? 'Scheduled dose is currently due' : 'Unconfirmed routine'),
              isReviewed,
              reviewedAt: this.reviewedAtMap[ev.id],
            });
          }
        }
      }

      // If Supabase is configured, also fetch any OPEN alerts for connected adults
      if (isSupabaseConfigured && supabase) {
        try {
          const adultIds = conns.map(c => c.older_adult_id);
          if (adultIds.length > 0) {
            const { data: dbAlerts } = await supabase
              .from('alerts')
              .select('*, older_adult:older_adults(*), medicine:medicines(*)')
              .in('older_adult_id', adultIds)
              .eq('status', 'OPEN');

            if (dbAlerts && dbAlerts.length > 0) {
              for (const a of dbAlerts) {
                // If not already in list
                if (!attentionList.some(item => item.id === a.id || item.medicineId === a.medicine_id)) {
                  attentionList.push({
                    id: a.id,
                    olderAdultId: a.older_adult_id,
                    olderAdultName: a.older_adult?.preferred_name || 'Connected Senior',
                    olderAdultPhone: (a.older_adult as any)?.phone || (a.older_adult as any)?.emergency_phone || '',
                    medicineId: a.medicine_id || '',
                    medicineName: a.medicine?.name || a.title || 'Medication',
                    dosage: a.medicine?.dosage || '',
                    scheduledTime: a.scheduled_time || new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: (a.type === 'DELAYED' ? 'DELAYED' : a.type === 'MISSED' ? 'MISSED' : 'ATTENTION_REQUIRED'),
                    pendingMinutes: a.pending_minutes || 0,
                    reason: a.message || 'Needs review',
                    isReviewed: this.reviewedAttentionIds.has(a.id),
                    reviewedAt: this.reviewedAtMap[a.id],
                  });
                }
              }
            }
          }
        } catch (e) {
          // non-blocking
        }
      }

      return { data: attentionList, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch attention items' };
    }
  }

  async markItemReviewed(itemId: string): Promise<ServiceResponse<boolean>> {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.reviewedAttentionIds.add(itemId);
    this.reviewedAtMap[itemId] = nowStr;
    this.persistReviewed();

    try {
      await alertService.acknowledgeAlert(itemId);
      await alertService.acknowledgeAlert(`alert-${itemId}`);
    } catch {
      // non-blocking
    }

    return { data: true, error: null };
  }
}

export const caregiverService = new CaregiverServiceImpl();
