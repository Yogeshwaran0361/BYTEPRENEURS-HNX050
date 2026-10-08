import { Profile, OlderAdult, Caregiver, ServiceResponse, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  DEV_SENIOR_PROFILE,
  DEV_OLDER_ADULT,
  DEV_CAREGIVER_PROFILE,
  DEV_CAREGIVER,
} from './mock/devSeedData';
import { voiceReminderService } from './voiceReminderService';

export interface SeniorRegistrationPayload {
  email: string;
  password?: string;
  phone?: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export interface CaregiverRegistrationPayload {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  relationshipType: string;
}

export interface AuthService {
  getCurrentProfile(): Promise<ServiceResponse<Profile>>;
  getCurrentOlderAdult(): Promise<ServiceResponse<OlderAdult | null>>;
  getCurrentCaregiver(): Promise<ServiceResponse<Caregiver | null>>;
  login(email: string, password?: string): Promise<ServiceResponse<Profile>>;
  registerSenior(payload: SeniorRegistrationPayload): Promise<ServiceResponse<Profile>>;
  registerCaregiver(payload: CaregiverRegistrationPayload): Promise<ServiceResponse<Profile>>;
  completeOnboarding(profileId: string): Promise<ServiceResponse<Profile>>;
  logout(): Promise<ServiceResponse<null>>;
  switchRole(role: UserRole): Promise<ServiceResponse<Profile>>;
  checkEmailExists(email: string): Promise<boolean>;
  findOlderAdultById(id: string): OlderAdult | null;
  findCaregiverById(id: string): Caregiver | null;
  getRegisteredUsers(): Array<{ profile: Profile; adult?: OlderAdult; caregiver?: Caregiver }>;
  updateCaregiverProfile(updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }): Promise<ServiceResponse<Caregiver>>;
}

/**
 * Formats authentication and database errors into calm, helpful, human-friendly messages.
 * Never exposes raw SQL errors or internal database internals to the user.
 */
function formatAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg = (err.message || String(err)).toLowerCase();

  if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('unique constraint')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant') || msg.includes('invalid credentials')) {
    return 'The email or password you entered is incorrect. Please check your credentials and try again.';
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('least 6'))) {
    return 'Please choose a stronger password with at least 6 characters.';
  }
  if (msg.includes('invalid email') || msg.includes('email format') || msg.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts in a short time. Please wait a moment and try again.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Unable to reach the server. Please check your internet connection.';
  }
  if (msg.includes('session expired') || msg.includes('jwt expired')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  return 'We were unable to complete this action. Please check your information and try again.';
}

class AuthServiceImpl implements AuthService {
  private activeProfile: Profile | null = null;
  private activeOlderAdult: OlderAdult | null = null;
  private activeCaregiver: Caregiver | null = null;

  // In-memory / localStorage registered users store for development fallback
  private registeredUsers: Array<{
    profile: Profile;
    adult?: OlderAdult;
    caregiver?: Caregiver;
    passwordHash?: string;
  }> = [];

  constructor() {
    this.loadFallbackState();
  }

  private loadFallbackState() {
    this.registeredUsers = [
      {
        profile: DEV_SENIOR_PROFILE,
        adult: DEV_OLDER_ADULT,
      },
      {
        profile: DEV_CAREGIVER_PROFILE,
        caregiver: DEV_CAREGIVER,
      },
    ];

    const savedUsers = localStorage.getItem('nestcare_registered_users');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          this.registeredUsers = [...this.registeredUsers, ...parsed];
        }
      } catch (e) {
        // fallback
      }
    }

    // Check if a custom caregiver profile was saved
    const savedCgRaw = localStorage.getItem('nestcare_caregiver_profile');
    if (savedCgRaw) {
      try {
        const parsedCg = JSON.parse(savedCgRaw);
        if (parsedCg.full_name) {
          const customCgProfile: Profile = {
            id: parsedCg.profile_id || 'dev-profile-caregiver-1',
            email: parsedCg.email || 'caregiver@nestcare.local',
            full_name: parsedCg.full_name,
            phone: parsedCg.phone || '',
            role: 'caregiver',
            onboarding_completed: true,
            created_at: new Date().toISOString(),
          };
          const customCaregiverObj: Caregiver = {
            id: parsedCg.id || 'dev-caregiver-1',
            profile_id: customCgProfile.id,
            relationship_type: parsedCg.relationship_type || 'Family Caregiver',
            phone: parsedCg.phone || '',
            created_at: new Date().toISOString(),
            profile: customCgProfile,
          };
          const existingIdx = this.registeredUsers.findIndex(u => u.profile.role === 'caregiver');
          if (existingIdx >= 0) {
            this.registeredUsers[existingIdx] = { profile: customCgProfile, caregiver: customCaregiverObj };
          } else {
            this.registeredUsers.push({ profile: customCgProfile, caregiver: customCaregiverObj });
          }
        }
      } catch (e) {}
    } else {
      // Check if senior profile has an emergency contact / caregiver registered
      const savedSenior = localStorage.getItem('nestcare_senior_profile');
      if (savedSenior) {
        try {
          const parsedSenior = JSON.parse(savedSenior);
          if (parsedSenior.emergency_contact_name) {
            const linkedCgProfile: Profile = {
              id: 'dev-profile-caregiver-1',
              email: 'caregiver@nestcare.local',
              full_name: parsedSenior.emergency_contact_name,
              phone: parsedSenior.emergency_contact_phone || '',
              role: 'caregiver',
              onboarding_completed: true,
              created_at: new Date().toISOString(),
            };
            const linkedCaregiverObj: Caregiver = {
              id: 'dev-caregiver-1',
              profile_id: linkedCgProfile.id,
              relationship_type: parsedSenior.emergency_contact_relationship || 'Caregiver',
              phone: parsedSenior.emergency_contact_phone || '',
              created_at: new Date().toISOString(),
              profile: linkedCgProfile,
            };
            const existingIdx = this.registeredUsers.findIndex(u => u.profile.role === 'caregiver');
            if (existingIdx >= 0) {
              this.registeredUsers[existingIdx] = { profile: linkedCgProfile, caregiver: linkedCaregiverObj };
            } else {
              this.registeredUsers.push({ profile: linkedCgProfile, caregiver: linkedCaregiverObj });
            }
          }
        } catch (e) {}
      }
    }

    const activeUserId = localStorage.getItem('nestcare_active_user_id');
    const activeRole = localStorage.getItem('nestcare_active_role') as UserRole | null;

    if (activeUserId) {
      const match = this.registeredUsers.find(u => u.profile.id === activeUserId);
      if (match) {
        this.activeProfile = match.profile;
        this.activeOlderAdult = match.adult || null;
        this.activeCaregiver = match.caregiver || null;
        return;
      }
    }

    if (activeRole === 'caregiver') {
      const customCg = this.registeredUsers.find(
        u => u.profile.role === 'caregiver' && u.profile.id !== DEV_CAREGIVER_PROFILE.id
      ) || this.registeredUsers.find(u => u.profile.role === 'caregiver');
      if (customCg) {
        this.activeProfile = customCg.profile;
        this.activeCaregiver = customCg.caregiver || null;
        this.activeOlderAdult = null;
      } else {
        this.activeProfile = DEV_CAREGIVER_PROFILE;
        this.activeCaregiver = DEV_CAREGIVER;
      }
    } else if (activeRole === 'senior') {
      const customSenior = this.registeredUsers.find(
        u => u.profile.role === 'senior' && u.profile.id !== DEV_SENIOR_PROFILE.id
      ) || this.registeredUsers.find(u => u.profile.role === 'senior');
      if (customSenior) {
        this.activeProfile = customSenior.profile;
        this.activeOlderAdult = customSenior.adult || null;
        this.activeCaregiver = null;
      } else {
        this.activeProfile = DEV_SENIOR_PROFILE;
        this.activeOlderAdult = DEV_OLDER_ADULT;
      }
    }
  }

  private persistFallbackUsers() {
    const custom = this.registeredUsers.filter(
      u => u.profile.id !== DEV_SENIOR_PROFILE.id && u.profile.id !== DEV_CAREGIVER_PROFILE.id
    );
    localStorage.setItem('nestcare_registered_users', JSON.stringify(custom));
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      // In Supabase, signUp will report if the user exists
      return false;
    }
    return this.registeredUsers.some(u => u.profile.email.toLowerCase() === normalized);
  }

  async getCurrentProfile(): Promise<ServiceResponse<Profile>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return { data: null, error: null };
        }

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (pError) {
          return { data: null, error: formatAuthError(pError) };
        }

        if (profile) {
          this.activeProfile = profile as Profile;
          localStorage.setItem('nestcare_active_user_id', profile.id);
          localStorage.setItem('nestcare_active_role', profile.role);
          return { data: profile as Profile, error: null };
        }

        return { data: null, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    return { data: this.activeProfile, error: null };
  }

  async getCurrentOlderAdult(): Promise<ServiceResponse<OlderAdult | null>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: null };

        const { data: adult, error: aError } = await supabase
          .from('older_adults')
          .select('*, profile:profiles(*)')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (aError) {
          return { data: null, error: formatAuthError(aError) };
        }

        this.activeOlderAdult = adult as OlderAdult | null;
        return { data: adult as OlderAdult | null, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    return { data: this.activeOlderAdult, error: null };
  }

  async getCurrentCaregiver(): Promise<ServiceResponse<Caregiver | null>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: null };

        const { data: caregiver, error: cError } = await supabase
          .from('caregivers')
          .select('*, profile:profiles(*)')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (cError) {
          return { data: null, error: formatAuthError(cError) };
        }

        this.activeCaregiver = caregiver as Caregiver | null;
        return { data: caregiver as Caregiver | null, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    return { data: this.activeCaregiver, error: null };
  }

  async login(email: string, password = ''): Promise<ServiceResponse<Profile>> {
    const normalized = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });

        if (authError) {
          return { data: null, error: formatAuthError(authError) };
        }

        if (!authData.user) {
          return { data: null, error: 'Sign in succeeded, but user profile could not be loaded.' };
        }

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (pError || !profile) {
          return { data: null, error: 'User profile could not be retrieved. Please try again.' };
        }

        this.activeProfile = profile as Profile;
        localStorage.setItem('nestcare_active_user_id', profile.id);
        localStorage.setItem('nestcare_active_role', profile.role);

        // Fetch adult or caregiver record in parallel
        if (profile.role === 'senior') {
          const { data: adult } = await supabase
            .from('older_adults')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();
          this.activeOlderAdult = adult as OlderAdult | null;
          this.activeCaregiver = null;
        } else {
          const { data: caregiver } = await supabase
            .from('caregivers')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();
          this.activeCaregiver = caregiver as Caregiver | null;
          this.activeOlderAdult = null;
        }

        return { data: profile as Profile, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    // Fallback mode for local dev preview
    const found = this.registeredUsers.find(u => u.profile.email.toLowerCase() === normalized);
    if (found) {
      this.activeProfile = found.profile;
      this.activeOlderAdult = found.adult || null;
      this.activeCaregiver = found.caregiver || null;
      localStorage.setItem('nestcare_active_user_id', found.profile.id);
      localStorage.setItem('nestcare_active_role', found.profile.role);
      return { data: found.profile, error: null };
    }

    return {
      data: null,
      error: "We couldn't sign you in with that email. Please check your credentials or create a new account.",
    };
  }

  async registerSenior(payload: SeniorRegistrationPayload): Promise<ServiceResponse<Profile>> {
    const normalized = payload.email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalized,
          password: payload.password || 'TemporaryPass123!',
          options: {
            data: {
              role: 'senior',
              full_name: payload.fullName.trim(),
              preferred_name: payload.preferredName?.trim() || payload.fullName.trim().split(' ')[0],
              phone: payload.phone?.trim(),
              date_of_birth: payload.dateOfBirth,
              address: payload.address?.trim(),
              emergency_contact_name: payload.emergencyContactName?.trim(),
              emergency_contact_phone: payload.emergencyContactPhone?.trim(),
              emergency_contact_relationship: payload.emergencyContactRelationship?.trim(),
            },
          },
        });

        if (authError) {
          return { data: null, error: formatAuthError(authError) };
        }

        if (!authData.user) {
          return { data: null, error: 'Registration could not be completed. Please try again.' };
        }

        // Database trigger auto-creates profile and older_adult record.
        // Wait brief moment or query profile
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const finalProfile = (profile || {
          id: authData.user.id,
          email: normalized,
          full_name: payload.fullName.trim(),
          phone: payload.phone?.trim(),
          role: 'senior',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        }) as Profile;

        this.activeProfile = finalProfile;
        localStorage.setItem('nestcare_active_user_id', finalProfile.id);
        localStorage.setItem('nestcare_active_role', 'senior');

        const { data: dbAdult } = await supabase
          .from('older_adults')
          .select('*, profile:profiles(*)')
          .eq('profile_id', finalProfile.id)
          .maybeSingle();

        this.activeOlderAdult = (dbAdult as OlderAdult) || {
          id: `adult-${finalProfile.id}`,
          profile_id: finalProfile.id,
          preferred_name: payload.preferredName?.trim() || payload.fullName.trim().split(' ')[0],
          date_of_birth: payload.dateOfBirth,
          phone: payload.phone?.trim() || finalProfile.phone,
          address: payload.address?.trim(),
          emergency_phone: payload.emergencyContactPhone?.trim(),
          emergency_contact_name: payload.emergencyContactName?.trim(),
          emergency_contact_phone: payload.emergencyContactPhone?.trim(),
          emergency_contact_relationship: payload.emergencyContactRelationship?.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
          created_at: new Date().toISOString(),
          profile: finalProfile,
        };
        this.activeCaregiver = null;

        return { data: finalProfile, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    // Local dev fallback
    if (await this.checkEmailExists(normalized)) {
      return {
        data: null,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    const profileId = `profile-senior-${Date.now()}`;
    const adultId = `adult-${Date.now()}`;

    const profile: Profile = {
      id: profileId,
      email: normalized,
      full_name: payload.fullName.trim(),
      phone: payload.phone?.trim(),
      role: 'senior',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
    };

    const adult: OlderAdult = {
      id: adultId,
      profile_id: profileId,
      preferred_name: payload.preferredName?.trim() || payload.fullName.trim().split(' ')[0],
      date_of_birth: payload.dateOfBirth,
      phone: payload.phone?.trim(),
      address: payload.address?.trim(),
      emergency_phone: payload.emergencyContactPhone?.trim(),
      emergency_contact_name: payload.emergencyContactName?.trim(),
      emergency_contact_phone: payload.emergencyContactPhone?.trim(),
      emergency_contact_relationship: payload.emergencyContactRelationship?.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      created_at: new Date().toISOString(),
      profile,
    };

    this.registeredUsers.push({ profile, adult });
    this.persistFallbackUsers();

    this.activeProfile = profile;
    this.activeOlderAdult = adult;
    this.activeCaregiver = null;
    localStorage.setItem('nestcare_active_user_id', profile.id);
    localStorage.setItem('nestcare_active_role', 'senior');

    return { data: profile, error: null };
  }

  async registerCaregiver(payload: CaregiverRegistrationPayload): Promise<ServiceResponse<Profile>> {
    const normalized = payload.email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalized,
          password: payload.password || 'TemporaryPass123!',
          options: {
            data: {
              role: 'caregiver',
              full_name: payload.fullName.trim(),
              relationship_type: payload.relationshipType,
              phone: payload.phone?.trim(),
            },
          },
        });

        if (authError) {
          return { data: null, error: formatAuthError(authError) };
        }

        if (!authData.user) {
          return { data: null, error: 'Registration could not be completed. Please try again.' };
        }

        if (!authData.session && payload.password) {
          try {
            await supabase.auth.signInWithPassword({
              email: normalized,
              password: payload.password,
            });
          } catch (e) {
            // non-blocking
          }
        }

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const finalProfile = (profile || {
          id: authData.user.id,
          email: normalized,
          full_name: payload.fullName.trim(),
          phone: payload.phone?.trim(),
          role: 'caregiver',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        }) as Profile;

        this.activeProfile = finalProfile;
        localStorage.setItem('nestcare_active_user_id', finalProfile.id);
        localStorage.setItem('nestcare_active_role', 'caregiver');

        const { data: dbCaregiver } = await supabase
          .from('caregivers')
          .select('*, profile:profiles(*)')
          .eq('profile_id', finalProfile.id)
          .maybeSingle();

        this.activeCaregiver = (dbCaregiver as Caregiver) || {
          id: `caregiver-${finalProfile.id}`,
          profile_id: finalProfile.id,
          relationship_type: payload.relationshipType,
          phone: payload.phone?.trim() || finalProfile.phone,
          created_at: new Date().toISOString(),
          profile: finalProfile,
        };
        this.activeOlderAdult = null;

        return { data: finalProfile, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    // Local dev fallback
    if (await this.checkEmailExists(normalized)) {
      return {
        data: null,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    const profileId = `profile-caregiver-${Date.now()}`;
    const caregiverId = `caregiver-${Date.now()}`;

    const profile: Profile = {
      id: profileId,
      email: normalized,
      full_name: payload.fullName.trim(),
      phone: payload.phone?.trim(),
      role: 'caregiver',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
    };

    const caregiver: Caregiver = {
      id: caregiverId,
      profile_id: profileId,
      relationship_type: payload.relationshipType,
      phone: payload.phone?.trim(),
      created_at: new Date().toISOString(),
      profile,
    };

    this.registeredUsers.push({ profile, caregiver });
    this.persistFallbackUsers();

    this.activeProfile = profile;
    this.activeCaregiver = caregiver;
    this.activeOlderAdult = null;
    localStorage.setItem('nestcare_active_user_id', profile.id);
    localStorage.setItem('nestcare_active_role', 'caregiver');

    return { data: profile, error: null };
  }

  async completeOnboarding(profileId: string): Promise<ServiceResponse<Profile>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
          .eq('id', profileId)
          .select()
          .single();

        if (error) {
          return { data: null, error: formatAuthError(error) };
        }

        this.activeProfile = data as Profile;
        return { data: data as Profile, error: null };
      } catch (err) {
        return { data: null, error: formatAuthError(err) };
      }
    }

    if (this.activeProfile && this.activeProfile.id === profileId) {
      this.activeProfile = { ...this.activeProfile, onboarding_completed: true };
    }

    const user = this.registeredUsers.find(u => u.profile.id === profileId);
    if (user) {
      user.profile.onboarding_completed = true;
      this.persistFallbackUsers();
    }

    return { data: this.activeProfile, error: null };
  }

  async logout(): Promise<ServiceResponse<null>> {
    voiceReminderService.stop();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // continue local cleanup
      }
    }

    this.activeProfile = null;
    this.activeOlderAdult = null;
    this.activeCaregiver = null;
    localStorage.removeItem('nestcare_active_user_id');
    localStorage.removeItem('nestcare_active_role');
    return { data: null, error: null };
  }

  async switchRole(role: UserRole): Promise<ServiceResponse<Profile>> {
    if (role === 'caregiver') {
      const customCg = this.registeredUsers.find(
        u => u.profile.role === 'caregiver' && u.profile.id !== DEV_CAREGIVER_PROFILE.id
      );
      if (customCg) {
        this.activeProfile = customCg.profile;
        this.activeCaregiver = customCg.caregiver || null;
        this.activeOlderAdult = null;
      } else {
        this.activeProfile = DEV_CAREGIVER_PROFILE;
        this.activeCaregiver = DEV_CAREGIVER;
        this.activeOlderAdult = null;
      }
    } else {
      const customSenior = this.registeredUsers.find(
        u => u.profile.role === 'senior' && u.profile.id !== DEV_SENIOR_PROFILE.id
      );
      if (customSenior) {
        this.activeProfile = customSenior.profile;
        this.activeOlderAdult = customSenior.adult || null;
        this.activeCaregiver = null;
      } else {
        this.activeProfile = DEV_SENIOR_PROFILE;
        this.activeOlderAdult = DEV_OLDER_ADULT;
        this.activeCaregiver = null;
      }
    }
    localStorage.setItem('nestcare_active_user_id', this.activeProfile.id);
    localStorage.setItem('nestcare_active_role', role);
    return { data: this.activeProfile, error: null };
  }

  findOlderAdultById(id: string): OlderAdult | null {
    if (!id) return null;
    if (this.activeOlderAdult && (this.activeOlderAdult.id === id || this.activeOlderAdult.profile_id === id)) {
      return this.activeOlderAdult;
    }
    const found = this.registeredUsers.find(
      u => u.adult && (u.adult.id === id || u.adult.profile_id === id || u.profile.id === id)
    );
    return found?.adult || null;
  }

  findCaregiverById(id: string): Caregiver | null {
    if (!id) return null;
    if (this.activeCaregiver && (this.activeCaregiver.id === id || this.activeCaregiver.profile_id === id)) {
      return this.activeCaregiver;
    }
    const found = this.registeredUsers.find(
      u => u.caregiver && (u.caregiver.id === id || u.caregiver.profile_id === id || u.profile.id === id)
    );
    return found?.caregiver || null;
  }

  getRegisteredUsers() {
    return [...this.registeredUsers];
  }

  async updateCaregiverProfile(updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }): Promise<ServiceResponse<Caregiver>> {
    const name = updates.fullName?.trim();
    const email = updates.email?.trim();
    const phone = updates.phone?.trim();
    const rel = updates.relationshipType?.trim();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (name || phone !== undefined) {
            await supabase.from('profiles').update({
              ...(name ? { full_name: name } : {}),
              ...(phone !== undefined ? { phone } : {}),
              updated_at: new Date().toISOString(),
            }).eq('id', user.id);
          }
          if (phone !== undefined || rel) {
            await supabase.from('caregivers').update({
              ...(phone !== undefined ? { phone } : {}),
              ...(rel ? { relationship_type: rel } : {}),
              updated_at: new Date().toISOString(),
            }).eq('profile_id', user.id);
          }
        }
      } catch (e) {
        // non-blocking
      }
    }

    if (!this.activeProfile) {
      this.activeProfile = {
        id: `dev-profile-caregiver-${Date.now()}`,
        email: email || 'caregiver@nestcare.local',
        full_name: name || 'Caregiver',
        phone: phone || '',
        role: 'caregiver',
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      };
    } else {
      if (name) this.activeProfile.full_name = name;
      if (email) this.activeProfile.email = email;
      if (phone !== undefined) this.activeProfile.phone = phone;
    }

    if (!this.activeCaregiver) {
      this.activeCaregiver = {
        id: `dev-caregiver-${Date.now()}`,
        profile_id: this.activeProfile.id,
        relationship_type: rel || 'Family Caregiver',
        phone: phone || '',
        created_at: new Date().toISOString(),
        profile: this.activeProfile,
      };
    } else {
      if (phone !== undefined) this.activeCaregiver.phone = phone;
      if (rel) this.activeCaregiver.relationship_type = rel;
      this.activeCaregiver.profile = this.activeProfile;
    }

    // Persist to localStorage
    const savedPayload = {
      id: this.activeCaregiver.id,
      profile_id: this.activeProfile.id,
      full_name: this.activeProfile.full_name,
      email: this.activeProfile.email,
      phone: this.activeCaregiver.phone,
      relationship_type: this.activeCaregiver.relationship_type,
      profile: this.activeProfile,
    };
    localStorage.setItem('nestcare_caregiver_profile', JSON.stringify(savedPayload));

    // Update registeredUsers collection
    const existingIdx = this.registeredUsers.findIndex(
      u => u.profile.id === this.activeProfile?.id || u.profile.role === 'caregiver'
    );
    if (existingIdx >= 0) {
      this.registeredUsers[existingIdx] = { profile: this.activeProfile, caregiver: this.activeCaregiver };
    } else {
      this.registeredUsers.push({ profile: this.activeProfile, caregiver: this.activeCaregiver });
    }
    this.persistFallbackUsers();

    // Also update connection in connectionService if present
    const savedConnsRaw = localStorage.getItem('nestcare_dev_connections');
    if (savedConnsRaw) {
      try {
        const conns: any[] = JSON.parse(savedConnsRaw);
        const updated = conns.map(c => ({
          ...c,
          caregiver: {
            ...c.caregiver,
            ...this.activeCaregiver,
            profile: this.activeProfile,
          },
        }));
        localStorage.setItem('nestcare_dev_connections', JSON.stringify(updated));
      } catch (e) {}
    }

    return { data: this.activeCaregiver, error: null };
  }
}

export const authService = new AuthServiceImpl();
