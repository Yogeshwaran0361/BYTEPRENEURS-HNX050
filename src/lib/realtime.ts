import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface RealtimeSubscriptionOptions {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

/**
 * Realtime subscription service for NESTCARE.
 * Listens to genuine PostgreSQL database changes broadcast through Supabase Realtime.
 */
export const realtimeService = {
  /**
   * Subscribes to medication log changes for a given older adult.
   * Enables Caregiver dashboards to update immediately when a senior takes medication.
   */
  subscribeToMedicationLogs(
    olderAdultId: string,
    callback: (event: 'INSERT' | 'UPDATE', record: any) => void
  ): RealtimeChannel | null {
    if (!isSupabaseConfigured || !supabase) return null;

    const channelName = `realtime-logs-${olderAdultId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medication_logs',
          filter: `older_adult_id=eq.${olderAdultId}`,
        },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.eventType, payload.new);
          }
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribes to alert creations and updates.
   * Enables Caregiver alert views to reflect new alerts and resolution status in real time.
   */
  subscribeToAlerts(
    callback: (event: 'INSERT' | 'UPDATE', record: any) => void
  ): RealtimeChannel | null {
    if (!isSupabaseConfigured || !supabase) return null;

    const channelName = `realtime-alerts-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.eventType, payload.new);
          }
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribes to senior support requests.
   */
  subscribeToSupportRequests(
    olderAdultId: string,
    callback: (record: any) => void
  ): RealtimeChannel | null {
    if (!isSupabaseConfigured || !supabase) return null;

    const channelName = `realtime-support-${olderAdultId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_requests',
          filter: `older_adult_id=eq.${olderAdultId}`,
        },
        payload => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Safe unsubscribe helper
   */
  unsubscribe(channel: RealtimeChannel | null): void {
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
  },
};
