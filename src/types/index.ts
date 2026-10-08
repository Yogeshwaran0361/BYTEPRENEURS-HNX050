/**
 * NESTCARE Core Domain Types & Data Architecture
 * Relational schema prepared for Supabase integration.
 */

export type UserRole = 'senior' | 'caregiver';

export type MedicationStatus =
  | 'UPCOMING'
  | 'DUE'
  | 'TAKEN'
  | 'DELAYED'
  | 'MISSED'
  | 'ATTENTION_REQUIRED';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type FoodInstruction = 'before_meal' | 'with_meal' | 'after_meal' | 'no_restriction';

export type AlertSeverity = 'info' | 'attention' | 'urgent';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export type ConnectionStatus = 'pending' | 'active' | 'revoked';

/**
 * Core User Profile (maps to Supabase auth.users & public.profiles)
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Older Adult Entity (specific to senior profile)
 */
export interface OlderAdult {
  id: string;
  profile_id: string;
  preferred_name: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  emergency_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
  timezone: string;
  created_at: string;
  updated_at?: string;
  // Hydrated helper fields
  profile?: Profile;
}

/**
 * Caregiver Entity
 */
export interface Caregiver {
  id: string;
  profile_id: string;
  relationship_type?: string; // e.g. "Daughter", "Son", "Spouse", "Grandchild", "Professional caregiver", "Other"
  phone?: string;
  created_at: string;
  updated_at?: string;
  profile?: Profile;
}

/**
 * Connection Code Model
 * Formatted like NC-7K4P-29, strictly isolated from internal UUIDs
 */
export interface ConnectionCode {
  code: string;
  older_adult_id: string;
  older_adult_name?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export type ConnectionErrorCode =
  | 'INVALID_CODE'
  | 'EXPIRED_CODE'
  | 'ALREADY_CONNECTED'
  | 'NOT_FOUND';

/**
 * Caregiver Connection Link
 */
export interface CaregiverConnection {
  id: string;
  caregiver_id: string;
  older_adult_id: string;
  status: ConnectionStatus;
  invite_code?: string;
  can_manage_medicines: boolean;
  receives_alerts: boolean;
  connected_at: string;
  // Hydrated relation fields
  older_adult?: OlderAdult;
  caregiver?: Caregiver;
}

export type MedicineFormType =
  | 'Tablet'
  | 'Capsule'
  | 'Liquid'
  | 'Syrup'
  | 'Drops'
  | 'Inhaler'
  | 'Injection'
  | 'Other';

export type MedicineFrequencyType =
  | 'Once a day'
  | 'Twice a day'
  | 'Three times a day'
  | 'Four times a day'
  | 'Custom';

export type FoodRelationType =
  | 'Before food'
  | 'With food'
  | 'After food'
  | 'Any time'
  | 'Not specified';

/**
 * Structured Medicine Entity (Prompt 4)
 */
export interface Medicine {
  id: string;
  older_adult_id: string;
  name: string;
  generic_name?: string;
  type: MedicineFormType;
  custom_type?: string;
  dosage: string; // e.g. "500 mg", "10 mg"
  amount_per_dose: string; // e.g. "1 tablet", "5 ml", "2 drops"
  container_capacity?: string; // e.g. "100 ml", "200 ml" (for syrup bottles/containers)
  taking_capacity?: string; // e.g. "10 ml", "15 ml" (actual taking cup/container capacity)
  frequency: MedicineFrequencyType | string;
  custom_frequency?: string;
  scheduled_times: string[]; // e.g. ["08:00 AM", "08:00 PM"]
  food_relation: FoodRelationType;
  start_date: string;
  end_date?: string | null;
  additional_instructions?: string;
  prescribed_by?: string;
  pharmacy?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Compatibility aliases
  form?: string;
  instructions?: string;
  food_instruction?: FoodInstruction;
}

/**
 * Medication Schedule Entity
 */
/**
 * Medication Schedule Entity (Prompt 5)
 */
export interface MedicationSchedule {
  id: string;
  medicine_id: string;
  older_adult_id: string;
  scheduled_time: string; // "09:00", "20:00" (24h format HH:mm) or "09:00 AM"
  time_of_day?: TimeOfDay;
  days_of_week?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday)
  start_date?: string;
  end_date?: string | null;
  food_instruction?: FoodInstruction;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Hydrated relation
  medicine?: Medicine;
}

/**
 * Medication Log (Confirmation and event record, Prompt 5)
 */
export interface MedicationLog {
  id: string;
  schedule_id: string;
  medicine_id: string;
  older_adult_id: string;
  scheduled_for: string; // ISO date-time string or YYYY-MM-DDTHH:mm:00
  status: MedicationStatus;
  confirmed_at?: string; // ISO timestamp when confirmed
  delay_minutes?: number;
  remind_at?: string;    // ISO timestamp if user clicked Remind Me Later
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Compatibility fields
  taken_at?: string;
  confirmed_by_id?: string;
  // Hydrated relations
  medicine?: Medicine;
  schedule?: MedicationSchedule;
}

/**
 * Support Request Entity (Prompt 5 & 7)
 */
export interface SupportRequest {
  id: string;
  older_adult_id: string;
  medication_log_id?: string;
  medicine_id?: string;
  medicine_name?: string;
  reason?: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  older_adult?: OlderAdult;
}

export type AlertType =
  | 'DELAYED'
  | 'MISSED'
  | 'ATTENTION_REQUIRED'
  | 'SUPPORT_REQUESTED';

export type AlertWorkflowStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED';

/**
 * Alert Entity (Prompt 7)
 */
export interface Alert {
  id: string;
  older_adult_id: string;
  caregiver_id?: string;
  medication_log_id?: string;
  schedule_id?: string;
  medicine_id?: string;
  type: AlertType;
  title: string;
  message: string;
  status: AlertWorkflowStatus;
  severity?: AlertSeverity;
  created_at: string;
  reviewed_at?: string;
  resolved_at?: string;
  resolved_by_id?: string;
  pending_minutes?: number;
  scheduled_time?: string;
  // Hydrated relations
  older_adult?: OlderAdult;
  medicine?: Medicine;
}

/**
 * Evaluated medication item for today (Prompt 5)
 */
export interface TodayMedicationItem {
  id: string; // Unique deterministic event ID (e.g. log ID or event key `sched-xxx_2026-10-08_09:00`)
  scheduleId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  amountPerDose?: string;
  scheduledTime: string; // Display formatted (e.g. "09:00 AM")
  scheduledFor: string;  // ISO string representing scheduled moment
  timeOfDay: TimeOfDay;
  foodInstruction?: FoodInstruction;
  foodRelation?: FoodRelationType;
  instructions?: string;
  status: MedicationStatus;
  logId?: string;
  confirmedAt?: string;
  takenAt?: string;
  delayMinutes?: number;
  remindAt?: string;
  needsAttentionReason?: string;
}

/**
 * Generic Service Result
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  errorCode?: string;
}
