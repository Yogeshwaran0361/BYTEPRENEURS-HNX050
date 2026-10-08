import { ConnectionCode, CaregiverConnection, ServiceResponse } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DEV_CONNECTION_CODE, DEV_CONNECTION, DEV_OLDER_ADULT, DEV_CAREGIVER } from './mock/devSeedData';
import { authService } from './authService';

export interface ConnectionService {
  getActiveCodeForSenior(olderAdultId?: string): Promise<ServiceResponse<ConnectionCode>>;
  generateNewCodeForSenior(olderAdultId?: string): Promise<ServiceResponse<ConnectionCode>>;
  verifyAndConnect(
    caregiverId: string,
    code: string,
    relationship?: string
  ): Promise<ServiceResponse<CaregiverConnection>>;
  getConnectionsForCaregiver(caregiverId?: string): Promise<ServiceResponse<CaregiverConnection[]>>;
  getConnectionsForSenior(olderAdultId?: string): Promise<ServiceResponse<CaregiverConnection[]>>;
}

// Generate code format: NC-XXXX-XX (e.g. NC-7K4P-29)
export function generateFormattedCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars (0, O, 1, I)
  let p1 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let p2 = '';
  for (let i = 0; i < 2; i++) {
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NC-${p1}-${p2}`;
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

class ConnectionServiceImpl implements ConnectionService {
  private codes: ConnectionCode[] = [DEV_CONNECTION_CODE];
  private connections: CaregiverConnection[] = [DEV_CONNECTION];

  constructor() {
    const savedCodes = localStorage.getItem('nestcare_connection_codes');
    if (savedCodes) {
      try {
        const parsed = JSON.parse(savedCodes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.codes = parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    const savedConns = localStorage.getItem('nestcare_dev_connections');
    if (savedConns) {
      try {
        this.connections = JSON.parse(savedConns);
      } catch (e) {
        // fallback
      }
    }
  }

  private saveCodes() {
    localStorage.setItem('nestcare_connection_codes', JSON.stringify(this.codes));
  }

  private saveConnections() {
    localStorage.setItem('nestcare_dev_connections', JSON.stringify(this.connections));
  }

  async getActiveCodeForSenior(olderAdultId?: string): Promise<ServiceResponse<ConnectionCode>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = await resolveOlderAdultId(olderAdultId);
        if (!resolvedId) return { data: null, error: 'Older adult not found' };

        const { data: adult, error } = await supabase
          .from('older_adults')
          .select('id, connection_code, preferred_name, created_at')
          .eq('id', resolvedId)
          .single();

        if (error || !adult) {
          return { data: null, error: error?.message || 'Could not load connection code' };
        }

        const activeCode: ConnectionCode = {
          code: adult.connection_code,
          older_adult_id: adult.id,
          older_adult_name: adult.preferred_name,
          created_at: adult.created_at,
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          is_active: true,
        };

        return { data: activeCode, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Failed to retrieve connection code' };
      }
    }

    const currentAdult = (await authService.getCurrentOlderAdult()).data;
    const targetId = olderAdultId || currentAdult?.id || 'dev-adult-1';
    let found = this.codes.find(c => c.older_adult_id === targetId && c.is_active);
    if (!found) {
      return this.generateNewCodeForSenior(targetId);
    }
    return { data: found, error: null };
  }

  async generateNewCodeForSenior(olderAdultId?: string): Promise<ServiceResponse<ConnectionCode>> {
    const formattedCode = generateFormattedCode();

    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = await resolveOlderAdultId(olderAdultId);
        if (!resolvedId) return { data: null, error: 'Older adult not found' };

        // Update connection_code on older_adults table
        const { data: adult, error } = await supabase
          .from('older_adults')
          .update({
            connection_code: formattedCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedId)
          .select()
          .single();

        if (error || !adult) {
          return { data: null, error: error?.message || 'Failed to generate new code' };
        }

        // Also record in connection_codes history table
        await supabase.from('connection_codes').insert({
          code: formattedCode,
          older_adult_id: resolvedId,
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          is_active: true,
        });

        const newCodeObj: ConnectionCode = {
          code: formattedCode,
          older_adult_id: resolvedId,
          older_adult_name: adult.preferred_name,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          is_active: true,
        };

        return { data: newCodeObj, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Could not generate code' };
      }
    }

    const currentAdult = (await authService.getCurrentOlderAdult()).data;
    const targetId = olderAdultId || currentAdult?.id || 'dev-adult-1';
    const adultObj = authService.findOlderAdultById(targetId) || currentAdult;
    const adultName = adultObj?.preferred_name || adultObj?.profile?.full_name || DEV_OLDER_ADULT.preferred_name;

    const newCode: ConnectionCode = {
      code: formattedCode,
      older_adult_id: targetId,
      older_adult_name: adultName,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_active: true,
    };

    this.codes = this.codes.map(c => (c.older_adult_id === targetId ? { ...c, is_active: false } : c));
    this.codes.push(newCode);
    this.saveCodes();

    return { data: newCode, error: null };
  }

  async verifyAndConnect(
    caregiverId: string,
    rawCode: string,
    relationship = 'Caregiver'
  ): Promise<ServiceResponse<CaregiverConnection>> {
    const formattedInput = rawCode.trim().toUpperCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const activeUserId = localStorage.getItem('nestcare_active_user_id') || caregiverId;
        const validCaregiverId = (activeUserId && !activeUserId.startsWith('caregiver-') && !activeUserId.startsWith('profile-'))
          ? activeUserId
          : null;

        const { data: rpcRes, error: rpcErr } = await supabase.rpc('connect_with_code', {
          p_code: formattedInput,
          p_relationship: relationship,
          p_caregiver_id: validCaregiverId,
        });

        if (rpcErr) {
          const msg = rpcErr.message || '';
          if (msg.includes('already connected')) {
            return {
              data: null,
              error: 'This older adult is already connected to your care account.',
              errorCode: 'ALREADY_CONNECTED',
            };
          }
          if (msg.includes('not find') || msg.includes('Invalid or expired')) {
            return {
              data: null,
              error: "We couldn't find that connection code. Check the code and try again.",
              errorCode: 'INVALID_CODE',
            };
          }
          return {
            data: null,
            error: msg || 'Unable to connect using that code. Please try again.',
            errorCode: 'INVALID_CODE',
          };
        }

        // Fetch the full connection with hydrated relations
        const { data: conn } = await supabase
          .from('caregiver_connections')
          .select('*, older_adult:older_adults(*, profile:profiles(*)), caregiver:caregivers(*, profile:profiles(*))')
          .eq('id', rpcRes.id)
          .maybeSingle();

        return { data: (conn || rpcRes) as CaregiverConnection, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Connection failed' };
      }
    }

    // Dev fallback
    const matchingCode = this.codes.find(c => c.code === formattedInput);
    if (!matchingCode) {
      return {
        data: null,
        error: "We couldn't find that connection code. Check the code and try again.",
        errorCode: 'INVALID_CODE',
      };
    }

    if (!matchingCode.is_active || new Date(matchingCode.expires_at) < new Date()) {
      return {
        data: null,
        error: 'This connection code is no longer active. Ask the older adult for a new code.',
        errorCode: 'EXPIRED_CODE',
      };
    }

    const activeCg = (await authService.getCurrentCaregiver()).data;
    const activeProf = (await authService.getCurrentProfile()).data;
    const validCaregiverId = caregiverId || activeCg?.id || (activeProf?.role === 'caregiver' ? activeProf.id : 'dev-caregiver-1');

    const existing = this.connections.find(
      c => c.older_adult_id === matchingCode.older_adult_id &&
           (c.caregiver_id === validCaregiverId || (activeCg && c.caregiver_id === activeCg.id)) &&
           c.status === 'active'
    );

    if (existing) {
      return {
        data: null,
        error: 'This older adult is already connected to your care account.',
        errorCode: 'ALREADY_CONNECTED',
      };
    }

    const targetAdult = authService.findOlderAdultById(matchingCode.older_adult_id);
    const resolvedOlderAdult = targetAdult || {
      id: matchingCode.older_adult_id,
      preferred_name: matchingCode.older_adult_name,
      phone: '',
      profile: {
        id: `profile-${matchingCode.older_adult_id}`,
        full_name: matchingCode.older_adult_name,
        role: 'senior' as const,
      },
    };

    const resolvedCaregiver = activeCg || {
      id: validCaregiverId,
      relationship_type: relationship,
      phone: activeProf?.phone || '',
      profile: activeProf || {
        id: validCaregiverId,
        full_name: 'Caregiver',
        role: 'caregiver' as const,
      },
    };

    const newConnection: CaregiverConnection = {
      id: `conn-${Date.now()}`,
      caregiver_id: validCaregiverId,
      older_adult_id: matchingCode.older_adult_id,
      status: 'active',
      invite_code: matchingCode.code,
      can_manage_medicines: true,
      receives_alerts: true,
      connected_at: new Date().toISOString(),
      older_adult: resolvedOlderAdult as any,
      caregiver: {
        ...resolvedCaregiver,
        relationship_type: relationship || (resolvedCaregiver as any).relationship_type || 'Caregiver',
      } as any,
    };

    this.connections.push(newConnection);
    this.saveConnections();

    return { data: newConnection, error: null };
  }

  async getConnectionsForCaregiver(caregiverId?: string): Promise<ServiceResponse<CaregiverConnection[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let query = supabase
          .from('caregiver_connections')
          .select('*, older_adult:older_adults(*, profile:profiles(*))')
          .eq('status', 'accepted');

        if (caregiverId && caregiverId !== 'dev-caregiver-1' && !caregiverId.startsWith('profile-')) {
          query = query.eq('caregiver_id', caregiverId);
        } else if (user) {
          const { data: cg } = await supabase.from('caregivers').select('id').eq('profile_id', user.id).maybeSingle();
          if (cg) {
            query = query.eq('caregiver_id', cg.id);
          } else {
            // Check if current user is the older adult previewing/accessing caretaker views
            const { data: adult } = await supabase.from('older_adults').select('id').eq('profile_id', user.id).maybeSingle();
            if (adult) {
              query = query.eq('older_adult_id', adult.id);
            }
          }
        }

        const { data, error } = await query;
        if (error) {
          return { data: [], error: error.message };
        }

        // Map status 'accepted' to 'active' for frontend compatibility
        const mapped = (data || []).map(c => ({
          ...c,
          status: c.status === 'accepted' ? 'active' : c.status,
        })) as CaregiverConnection[];

        return { data: mapped, error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Failed to load caregiver connections' };
      }
    }

    const activeCg = (await authService.getCurrentCaregiver()).data;
    const activeProf = (await authService.getCurrentProfile()).data;
    const targetId = caregiverId || activeCg?.id || (activeProf?.role === 'caregiver' ? activeProf.id : null);

    if (targetId) {
      const results = this.connections.filter(c =>
        (c.caregiver_id === targetId || (activeCg && c.caregiver_id === activeCg.id) || (activeProf && c.caregiver_id === activeProf.id)) &&
        c.status === 'active'
      );
      return { data: results, error: null };
    }

    // Only fallback if explicit demo user
    const results = this.connections.filter(c => c.caregiver_id === 'dev-caregiver-1' && c.status === 'active');
    return { data: results, error: null };
  }

  async getConnectionsForSenior(olderAdultId?: string): Promise<ServiceResponse<CaregiverConnection[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const resolvedId = await resolveOlderAdultId(olderAdultId);
        let query = supabase
          .from('caregiver_connections')
          .select('*, caregiver:caregivers(*, profile:profiles(*))')
          .eq('status', 'accepted');

        if (resolvedId) {
          query = query.eq('older_adult_id', resolvedId);
        }

        const { data, error } = await query;
        if (error) {
          return { data: [], error: error.message };
        }

        const mapped = (data || []).map(c => ({
          ...c,
          status: c.status === 'accepted' ? 'active' : c.status,
        })) as CaregiverConnection[];

        return { data: mapped, error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Failed to load connections' };
      }
    }

    const activeAdult = (await authService.getCurrentOlderAdult()).data;
    const activeProf = (await authService.getCurrentProfile()).data;
    const targetId = olderAdultId || activeAdult?.id || (activeProf?.role === 'senior' ? activeProf.id : null);

    if (targetId) {
      const results = this.connections.filter(c =>
        (c.older_adult_id === targetId || (activeAdult && c.older_adult_id === activeAdult.id) || (activeProf && c.older_adult_id === activeProf.id)) &&
        c.status === 'active'
      );
      return { data: results, error: null };
    }

    const results = this.connections.filter(c => c.older_adult_id === 'dev-adult-1' && c.status === 'active');
    return { data: results, error: null };
  }
}

export const connectionService = new ConnectionServiceImpl();
