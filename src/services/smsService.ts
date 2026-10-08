import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ServiceResponse } from '../types';

export interface NotificationLog {
  id: string;
  alert_id?: string;
  older_adult_id: string;
  caregiver_id?: string;
  recipient_phone: string;
  event_type: 'DELAYED' | 'MISSED' | 'SUPPORT_REQUESTED' | 'ATTENTION_REQUIRED';
  occurrence_key: string;
  message_body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  provider_message_id?: string;
  error_message?: string;
  attempts: number;
  created_at: string;
}

export interface CaregiverSettings {
  id?: string;
  caregiver_id: string;
  due_grace_period_minutes: number;
  missed_threshold_minutes: number;
  sms_enabled: boolean;
}

export interface SendSmsParams {
  olderAdultId: string;
  caregiverId?: string;
  alertId?: string;
  eventType: 'DELAYED' | 'MISSED' | 'SUPPORT_REQUESTED' | 'ATTENTION_REQUIRED';
  occurrenceKey: string;
  seniorName: string;
  scheduledTime?: string;
  recipientPhone?: string;
  customBody?: string;
}

class SmsService {
  private localLogs: NotificationLog[] = [];

  constructor() {
    const saved = localStorage.getItem('nestcare_notification_logs');
    if (saved) {
      try {
        this.localLogs = JSON.parse(saved);
      } catch {}
    }
  }

  private persist() {
    localStorage.setItem('nestcare_notification_logs', JSON.stringify(this.localLogs));
  }

  /**
   * Invokes the server-side send-sms function to dispatch a real SMS.
   * If Edge Function is not yet deployed, records simulated or error state safely without pretending it was sent.
   */
  async triggerSms(params: SendSmsParams): Promise<ServiceResponse<{ status: string; messageId?: string; logId?: string }>> {
    // 1. Idempotency Check
    const existing = this.localLogs.find(l => l.occurrence_key === params.occurrenceKey);
    if (existing && existing.status === 'SENT') {
      return {
        data: {
          status: 'SENT',
          messageId: existing.provider_message_id,
          logId: existing.id,
        },
        error: null,
      };
    }

    // 2. Format standard template
    const timeStr = params.scheduledTime || 'scheduled time';
    let body = params.customBody;
    if (!body) {
      if (params.eventType === 'DELAYED') {
        body = `NESTCARE ALERT: ${params.seniorName}'s medication scheduled for ${timeStr} has not been confirmed and is delayed. Please check the NESTCARE caregiver portal.`;
      } else if (params.eventType === 'MISSED') {
        body = `NESTCARE ALERT: ${params.seniorName}'s medication scheduled for ${timeStr} remains unconfirmed and is marked missed. Please check the NESTCARE caregiver portal.`;
      } else if (params.eventType === 'SUPPORT_REQUESTED') {
        body = `NESTCARE SUPPORT: ${params.seniorName} has requested assistance. Please check the NESTCARE caregiver portal.`;
      } else {
        body = `NESTCARE ALERT: Attention is required for ${params.seniorName}'s routine. Please check the NESTCARE caregiver portal.`;
      }
    }

    const phone = params.recipientPhone || '+1 (555) 000-0000';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            olderAdultId: params.olderAdultId,
            caregiverId: params.caregiverId,
            alertId: params.alertId,
            eventType: params.eventType,
            occurrenceKey: params.occurrenceKey,
            seniorName: params.seniorName,
            scheduledTime: params.scheduledTime,
            recipientPhone: params.recipientPhone,
            customBody: params.customBody,
          },
        });

        if (error) {
          // Record failure accurately
          const failLog: NotificationLog = {
            id: `notif-${Date.now()}`,
            older_adult_id: params.olderAdultId,
            recipient_phone: phone,
            event_type: params.eventType,
            occurrence_key: params.occurrenceKey,
            message_body: body,
            status: 'FAILED',
            error_message: error.message || 'Edge function call failed',
            attempts: 1,
            created_at: new Date().toISOString(),
          };
          this.localLogs.unshift(failLog);
          this.persist();

          return {
            data: { status: 'FAILED', logId: failLog.id },
            error: error.message,
          };
        }

        return {
          data: {
            status: data?.status || 'SENT',
            messageId: data?.messageId,
            logId: data?.notificationLogId,
          },
          error: data?.error || null,
        };
      } catch (err: any) {
        // Fallback to recording accurately
      }
    }

    // Local / development environment tracking without pretending SMS was delivered
    const logItem: NotificationLog = {
      id: `notif-${Date.now()}`,
      older_adult_id: params.olderAdultId,
      caregiver_id: params.caregiverId,
      alert_id: params.alertId,
      recipient_phone: phone,
      event_type: params.eventType,
      occurrence_key: params.occurrenceKey,
      message_body: body,
      status: 'FAILED',
      error_message: 'Twilio SMS credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured in Supabase Edge Secrets.',
      attempts: 1,
      created_at: new Date().toISOString(),
    };
    this.localLogs.unshift(logItem);
    this.persist();

    return {
      data: { status: 'FAILED', logId: logItem.id },
      error: 'SMS provider credentials pending configuration in Supabase.',
    };
  }

  /**
   * Retrieves notification delivery logs
   */
  async getNotificationLogs(olderAdultId?: string): Promise<ServiceResponse<NotificationLog[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('notification_logs').select('*').order('created_at', { ascending: false });
        if (olderAdultId) {
          query = query.eq('older_adult_id', olderAdultId);
        }
        const { data, error } = await query;
        if (!error && data) {
          return { data: data as NotificationLog[], error: null };
        }
      } catch {}
    }

    const filtered = olderAdultId
      ? this.localLogs.filter(l => l.older_adult_id === olderAdultId)
      : this.localLogs;
    return { data: filtered, error: null };
  }

  /**
   * Loads caregiver settings (grace period, missed threshold, SMS toggle)
   */
  async getCaregiverSettings(caregiverId: string): Promise<ServiceResponse<CaregiverSettings>> {
    const defaultSettings: CaregiverSettings = {
      caregiver_id: caregiverId,
      due_grace_period_minutes: 30,
      missed_threshold_minutes: 60,
      sms_enabled: true,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('caregiver_settings')
          .select('*')
          .eq('caregiver_id', caregiverId)
          .maybeSingle();

        if (data && !error) {
          return { data: data as CaregiverSettings, error: null };
        }
      } catch {}
    }

    const saved = localStorage.getItem(`nestcare_cg_settings_${caregiverId}`);
    if (saved) {
      try {
        return { data: JSON.parse(saved), error: null };
      } catch {}
    }

    return { data: defaultSettings, error: null };
  }

  /**
   * Updates caregiver settings
   */
  async updateCaregiverSettings(settings: CaregiverSettings): Promise<ServiceResponse<CaregiverSettings>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('caregiver_settings')
          .upsert(
            {
              caregiver_id: settings.caregiver_id,
              due_grace_period_minutes: settings.due_grace_period_minutes,
              missed_threshold_minutes: settings.missed_threshold_minutes,
              sms_enabled: settings.sms_enabled,
            },
            { onConflict: 'caregiver_id' }
          )
          .select()
          .single();

        if (data && !error) {
          return { data: data as CaregiverSettings, error: null };
        }
      } catch {}
    }

    localStorage.setItem(`nestcare_cg_settings_${settings.caregiver_id}`, JSON.stringify(settings));
    return { data: settings, error: null };
  }
}

export const smsService = new SmsService();
