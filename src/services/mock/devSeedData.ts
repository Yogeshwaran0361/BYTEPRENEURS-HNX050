/**
 * =========================================================================
 * ISOLATED DEVELOPMENT PREVIEW DATA (DEV ONLY)
 * =========================================================================
 * 
 * IMPORTANT ARCHITECTURAL NOTICE:
 * This file contains strictly isolated development scaffolding fixtures.
 * It is NOT production data.
 * No UI components depend on this directly.
 * Production repositories will interface directly with Supabase in Prompt 8.
 */

import {
  Profile,
  OlderAdult,
  Caregiver,
  CaregiverConnection,
  Medicine,
  MedicationSchedule,
  MedicationLog,
  Alert,
  TodayMedicationItem,
  ConnectionCode,
} from '../../types';

function getInitialSeniorProfile(): Profile {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nestcare_senior_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile) return parsed.profile;
        if (parsed.preferred_name || parsed.full_name) {
          return {
            id: parsed.profile_id || parsed.id || 'dev-profile-senior-1',
            email: parsed.email || 'senior@nestcare.local',
            full_name: parsed.preferred_name || parsed.full_name || 'Senior',
            phone: parsed.phone || '',
            role: 'senior',
            onboarding_completed: true,
            created_at: new Date().toISOString(),
          };
        }
      } catch (e) {}
    }
  }
  return {
    id: 'dev-profile-senior-1',
    email: 'senior@nestcare.local',
    full_name: 'Senior',
    phone: '',
    role: 'senior',
    onboarding_completed: true,
    created_at: new Date().toISOString(),
  };
}

function getInitialOlderAdult(): OlderAdult {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nestcare_senior_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id) return parsed;
      } catch (e) {}
    }
  }
  return {
    id: 'dev-adult-1',
    profile_id: 'dev-profile-senior-1',
    preferred_name: 'Senior',
    date_of_birth: '1950-01-01',
    phone: '',
    emergency_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    notes: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    created_at: new Date().toISOString(),
  };
}

function getInitialCaregiverProfile(): Profile {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nestcare_caregiver_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile) return parsed.profile;
        if (parsed.full_name) {
          return {
            id: parsed.profile_id || 'dev-profile-caregiver-1',
            email: parsed.email || 'caregiver@nestcare.local',
            full_name: parsed.full_name,
            phone: parsed.phone || '',
            role: 'caregiver',
            onboarding_completed: true,
            created_at: new Date().toISOString(),
          };
        }
      } catch (e) {}
    }
    // Check if senior has emergency contact / caretaker info registered!
    const seniorSaved = localStorage.getItem('nestcare_senior_profile');
    if (seniorSaved) {
      try {
        const parsed = JSON.parse(seniorSaved);
        if (parsed.emergency_contact_name) {
          return {
            id: 'dev-profile-caregiver-1',
            email: 'caregiver@nestcare.local',
            full_name: parsed.emergency_contact_name,
            phone: parsed.emergency_contact_phone || '',
            role: 'caregiver',
            onboarding_completed: true,
            created_at: new Date().toISOString(),
          };
        }
      } catch (e) {}
    }
  }
  return {
    id: 'dev-profile-caregiver-1',
    email: 'caregiver@nestcare.local',
    full_name: 'Caregiver',
    phone: '',
    role: 'caregiver',
    onboarding_completed: true,
    created_at: new Date().toISOString(),
  };
}

function getInitialCaregiver(): Caregiver {
  const prof = getInitialCaregiverProfile();
  let rel = 'Family Caregiver';
  let phone = prof.phone || '';
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nestcare_caregiver_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.relationship_type) rel = parsed.relationship_type;
        if (parsed.phone) phone = parsed.phone;
      } catch (e) {}
    } else {
      const seniorSaved = localStorage.getItem('nestcare_senior_profile');
      if (seniorSaved) {
        try {
          const parsed = JSON.parse(seniorSaved);
          if (parsed.emergency_contact_relationship) rel = parsed.emergency_contact_relationship;
          if (parsed.emergency_contact_phone) phone = parsed.emergency_contact_phone;
        } catch (e) {}
      }
    }
  }
  return {
    id: 'dev-caregiver-1',
    profile_id: prof.id,
    relationship_type: rel,
    phone: phone,
    created_at: new Date().toISOString(),
    profile: prof,
  };
}

export const DEV_SENIOR_PROFILE: Profile = getInitialSeniorProfile();
export const DEV_OLDER_ADULT: OlderAdult = getInitialOlderAdult();
export const DEV_CAREGIVER_PROFILE: Profile = getInitialCaregiverProfile();
export const DEV_CAREGIVER: Caregiver = getInitialCaregiver();

export const DEV_CONNECTION_CODE: ConnectionCode = {
  code: 'NC-7K4P-29',
  older_adult_id: DEV_OLDER_ADULT.id,
  older_adult_name: DEV_OLDER_ADULT.preferred_name || 'Senior',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
  is_active: true,
};

export const DEV_CONNECTION: CaregiverConnection = {
  id: 'dev-conn-1',
  caregiver_id: DEV_CAREGIVER.id,
  older_adult_id: DEV_OLDER_ADULT.id,
  status: 'active',
  invite_code: 'NC-7K4P-29',
  can_manage_medicines: true,
  receives_alerts: true,
  connected_at: new Date().toISOString(),
  older_adult: DEV_OLDER_ADULT,
  caregiver: DEV_CAREGIVER,
};

export const DEV_MEDICINES: Medicine[] = [
  {
    id: 'med-1',
    older_adult_id: 'dev-adult-1',
    name: 'Amlodipine',
    generic_name: 'Norvasc',
    type: 'Tablet',
    dosage: '5 mg',
    amount_per_dose: '1 tablet',
    frequency: 'Once a day',
    scheduled_times: ['09:00 AM'],
    food_relation: 'Any time',
    start_date: '2026-01-15',
    end_date: null,
    additional_instructions: 'Take 1 tablet every morning with water.',
    instructions: 'Take 1 tablet every morning with water.',
    prescribed_by: 'Dr. Sarah Lin (Cardiology)',
    pharmacy: 'Community Care Pharmacy',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'med-2',
    older_adult_id: 'dev-adult-1',
    name: 'Metformin',
    generic_name: 'Glucophage',
    type: 'Tablet',
    dosage: '500 mg',
    amount_per_dose: '1 tablet',
    frequency: 'Once a day',
    scheduled_times: ['07:30 PM'],
    food_relation: 'After food',
    start_date: '2026-02-01',
    end_date: null,
    additional_instructions: 'Take 1 tablet after dinner with food.',
    instructions: 'Take 1 tablet after dinner with food.',
    prescribed_by: 'Dr. Michael Hayes (Endocrinology)',
    pharmacy: 'Community Care Pharmacy',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const DEV_SCHEDULES: MedicationSchedule[] = [
  {
    id: 'sched-1',
    medicine_id: 'med-1',
    older_adult_id: 'dev-adult-1',
    scheduled_time: '09:00',
    time_of_day: 'morning',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    food_instruction: 'no_restriction',
    is_active: true,
    created_at: new Date().toISOString(),
    medicine: DEV_MEDICINES[0],
  },
  {
    id: 'sched-2',
    medicine_id: 'med-2',
    older_adult_id: 'dev-adult-1',
    scheduled_time: '19:30',
    time_of_day: 'evening',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    food_instruction: 'after_meal',
    is_active: true,
    created_at: new Date().toISOString(),
    medicine: DEV_MEDICINES[1],
  },
];

export const DEV_TODAY_ITEMS: TodayMedicationItem[] = [
  {
    id: 'dev-event-1',
    scheduleId: 'sched-1',
    medicineId: 'med-1',
    medicineName: 'Amlodipine',
    dosage: '5 mg',
    scheduledTime: '09:00 AM',
    scheduledFor: new Date().toISOString(),
    timeOfDay: 'morning',
    foodInstruction: 'no_restriction',
    instructions: 'Take 1 tablet with water.',
    status: 'TAKEN',
    takenAt: '09:08 AM',
  },
  {
    id: 'dev-event-2',
    scheduleId: 'sched-2',
    medicineId: 'med-2',
    medicineName: 'Metformin',
    dosage: '500 mg',
    scheduledTime: '07:30 PM',
    scheduledFor: new Date().toISOString(),
    timeOfDay: 'evening',
    foodInstruction: 'after_meal',
    instructions: 'Take 1 tablet after dinner with food.',
    status: 'DUE',
  },
];

export const DEV_LOGS: MedicationLog[] = [
  {
    id: 'log-1',
    schedule_id: 'sched-1',
    medicine_id: 'med-1',
    older_adult_id: 'dev-adult-1',
    scheduled_for: new Date().toISOString(),
    taken_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'TAKEN',
    confirmed_by_id: 'dev-profile-senior-1',
    notes: 'Taken on time after breakfast',
    created_at: new Date().toISOString(),
  },
];

export const DEV_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    older_adult_id: 'dev-adult-1',
    medicine_id: 'med-2',
    type: 'DELAYED',
    title: 'Medication activity needs review',
    message: 'Evening Metformin (500mg) has not been confirmed yet.',
    status: 'OPEN',
    severity: 'attention',
    pending_minutes: 30,
    scheduled_time: '07:30 PM',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    older_adult: DEV_OLDER_ADULT,
    medicine: DEV_MEDICINES[1],
  },
];
