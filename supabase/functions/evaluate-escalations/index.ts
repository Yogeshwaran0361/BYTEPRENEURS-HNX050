// Supabase Edge Function: evaluate-escalations
// Runs periodically on server to evaluate unconfirmed medication schedules across all seniors,
// generate DELAYED / MISSED alerts in database, and trigger SMS notifications.
import { serve } from https://deno.land/std@0.168.0/http/server.ts;
import { createClient } from https://esm.sh/@supabase/supabase-js@2.117.3;

const corsHeaders = {
  Access-Control-Allow-Origin: *,
  Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type,
};

serve(async (req: Request) => {
  if (req.method === OPTIONS) {
    return new Response(ok, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get(SUPABASE_URL) || ";
 const supabaseServiceKey = Deno.env.get(SUPABASE_SERVICE_ROLE_KEY) || ;
 const cronSecret = Deno.env.get(CRON_SECRET);

 // Optional verification of cron secret if provided in query or auth header
 const authHeader = req.headers.get(authorization);
 if (cronSecret && authHeader !== Bearer && authHeader !== Bearer ) {
 // allow service_role authorization
 }

 const supabase = createClient(supabaseUrl, supabaseServiceKey);
 const now = new Date();

 // 1. Fetch all active schedules with their medicines and older adults
 const { data: schedules, error: schedErr } = await supabase
 .from(medication_schedules)
 .select(
 id,
 scheduled_time,
 days_of_week,
 medicine:medicines (
 id,
 name,
 dosage,
 is_active
 ),
 older_adult:older_adults (
 id,
 preferred_name,
 timezone,
 profile:profiles (full_name)
 )
 )
 .eq(is_active, true);

 if (schedErr) {
 throw schedErr;
 }

 const results: any[] = [];

 for (const item of schedules || []) {
 const med = item.medicine as any;
 const adult = item.older_adult as any;
 if (!med || !med.is_active || !adult) continue;

 const timezone = adult.timezone || America/New_York;
 const seniorName = adult.preferred_name || adult.profile?.full_name || Senior;

 // Parse scheduled time (e.g. 09:00, 09:00 AM, 21:30)
 const timeMatch = item.scheduled_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
 if (!timeMatch) continue;

 let hour = parseInt(timeMatch[1], 10);
 const minute = parseInt(timeMatch[2], 10);
 const meridian = timeMatch[3]?.toUpperCase();
 if (meridian === PM && hour < 12) hour += 12;
 if (meridian === AM && hour === 12) hour = 0;

 // Calculate scheduled Date for today in older adult's timezone
 const localDateStr = new Intl.DateTimeFormat(en-CA, { timeZone: timezone }).format(now); // YYYY-MM-DD
 const [year, month, day] = localDateStr.split(-).map(Number);

 // Scheduled moment ISO
 const scheduledMoment = new Date(Date.UTC(year, month - 1, day, hour, minute));
 const scheduledIso = scheduledMoment.toISOString();
 const diffMinutes = Math.floor((now.getTime() - scheduledMoment.getTime()) / 60000);

 // Dose not due yet -> skip
 if (diffMinutes < 0) continue;

 // 2. Check if a medication log exists for this occurrence
 const { data: logs } = await supabase
 .from(medication_logs)
 .select(id, status, remind_at, confirmed_at)
 .eq(schedule_id, item.id)
 .gte(scheduled_at, ${localDateStr}T00:00:00Z)
 .lte(scheduled_at, ${localDateStr}T23:59:59Z);

 const currentLog = logs && logs.length > 0 ? logs[0] : null;

 // If dose already taken -> cancel pending alerts & skip
 if (currentLog && currentLog.status === TAKEN) {
 await supabase
 .from(alerts)
 .update({ status: RESOLVED, resolved_at: now.toISOString() })
 .eq(schedule_id, item.id)
 .eq(status, OPEN);
 continue;
 }

 // If snoozed / postponed -> check if postpone time has arrived
 if (currentLog?.remind_at && new Date(currentLog.remind_at).getTime() > now.getTime()) {
 continue;
 }

 // 3. Fetch caregiver configuration for this adult
 const { data: conns } = await supabase
 .from(caregiver_connections)
 .select(
 caregiver_id,
 receives_alerts,
 caregiver:caregivers (
 id,
 phone,
 settings:caregiver_settings (
 due_grace_period_minutes,
 missed_threshold_minutes,
 sms_enabled
 )
 )
 )
 .eq(older_adult_id, adult.id)
 .eq(status, accepted);

 let gracePeriod = 30; // default 30 mins
 let missedThreshold = 60; // default 60 mins
 let smsEnabled = true;

 if (conns && conns.length > 0) {
 const cg = conns[0].caregiver as any;
 const s = cg?.settings?.[0] || cg?.settings;
 if (s) {
 gracePeriod = s.due_grace_period_minutes ?? gracePeriod;
 missedThreshold = s.missed_threshold_minutes ?? missedThreshold;
 smsEnabled = s.sms_enabled ?? smsEnabled;
 }
 }

 // 4. Determine Escalation State
 // 0 <= diffMinutes <= gracePeriod -> DUE (display in portal only, NO routine SMS)
 if (diffMinutes <= gracePeriod) {
 continue;
 }

 let eventType: DELAYED | MISSED = DELAYED;
 let alertTitle = Senior Unresponsive: Medication Delayed;
 let alertMessage = ${med.name} () scheduled for — senior did not respond to medication reminder.;

 if (diffMinutes > missedThreshold) {
 eventType = MISSED;
 alertTitle = Medication activity was not confirmed;
 alertMessage = ${med.name} () scheduled for was not confirmed.;
 }

 // 5. Create or Update Alert in Database (Idempotent)
 const { data: existingAlert } = await supabase
 .from(alerts)
 .select(id, status, type)
 .eq(older_adult_id, adult.id)
 .eq(schedule_id, item.id)
 .eq(status, OPEN)
 .maybeSingle();

 let alertId = existingAlert?.id;

 if (!existingAlert) {
 const { data: newAlert } = await supabase
 .from(alerts)
 .insert({
 older_adult_id: adult.id,
 schedule_id: item.id,
 medicine_id: med.id,
 type: eventType,
 title: alertTitle,
 message: alertMessage,
 status: OPEN,
 severity: urgent,
 pending_minutes: diffMinutes,
 scheduled_time: item.scheduled_time,
 })
 .select(id)
 .single();
 alertId = newAlert?.id;
 } else if (existingAlert.type !== eventType) {
 // Escalate from DELAYED -> MISSED
 await supabase
 .from(alerts)
 .update({
 type: eventType,
 title: alertTitle,
 message: alertMessage,
 pending_minutes: diffMinutes,
 })
 .eq(id, existingAlert.id);
 }

 // 6. Trigger One Real SMS Dispatch for this Escalation Event
 if (smsEnabled) {
 const occurrenceKey = ${item.id}__::;

 // Call send-sms function via internal invoke or fetch
 const smsRes = await fetch(${supabaseUrl}/functions/v1/send-sms, {
 method: POST,
 headers: {
 Content-Type: application/json,
 Authorization: Bearer ,
 },
 body: JSON.stringify({
 olderAdultId: adult.id,
 alertId: alertId,
 eventType: eventType,
 occurrenceKey: occurrenceKey,
 seniorName: seniorName,
 scheduledTime: item.scheduled_time,
 }),
 });

 const smsJson = await smsRes.json().catch(() => ({}));
 results.push({
 scheduleId: item.id,
 seniorName,
 medicine: med.name,
 diffMinutes,
 eventType,
 smsStatus: smsJson.status || (smsRes.ok ? SENT : FAILED),
 });
 }
 }

 return new Response(
 JSON.stringify({
 success: true,
 evaluatedAt: now.toISOString(),
 escalationsEvaluated: results.length,
 results,
 }),
 { status: 200, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 } catch (err: any) {
 return new Response(
 JSON.stringify({ error: err?.message || Error evaluating escalations }),
 { status: 500, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }
});
