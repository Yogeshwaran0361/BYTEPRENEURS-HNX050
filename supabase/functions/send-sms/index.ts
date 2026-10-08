// Supabase Edge Function: send-sms
// Sends real SMS via Twilio or standard SMS gateway, enforcing deduplication, authorization, and E.164 formatting.
import { serve } from https://deno.land/std@0.168.0/http/server.ts;
import { createClient } from https://esm.sh/@supabase/supabase-js@2.117.3;

const corsHeaders = {
  Access-Control-Allow-Origin: *,
  Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type,
};

interface SendSmsPayload {
  olderAdultId: string;
  caregiverId?: string;
  alertId?: string;
  eventType: DELAYED | MISSED | SUPPORT_REQUESTED | ATTENTION_REQUIRED;
  occurrenceKey: string;
  seniorName: string;
  scheduledTime?: string;
  recipientPhone?: string;
  customBody?: string;
}

serve(async (req: Request) => {
  if (req.method === OPTIONS) {
    return new Response(ok, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get(SUPABASE_URL) || ";
 const supabaseServiceKey = Deno.env.get(SUPABASE_SERVICE_ROLE_KEY) || ;
 const twilioAccountSid = Deno.env.get(TWILIO_ACCOUNT_SID) || ;
 const twilioAuthToken = Deno.env.get(TWILIO_AUTH_TOKEN) || ;
 const twilioFromNumber = Deno.env.get(TWILIO_PHONE_NUMBER) || ;

 const supabase = createClient(supabaseUrl, supabaseServiceKey);
 const body: SendSmsPayload = await req.json();

 const {
 olderAdultId,
 caregiverId,
 alertId,
 eventType,
 occurrenceKey,
 seniorName,
 scheduledTime,
 customBody,
 } = body;

 if (!olderAdultId || !eventType || !occurrenceKey || !seniorName) {
 return new Response(
 JSON.stringify({ error: Missing required fields: olderAdultId, eventType, occurrenceKey, seniorName }),
 { status: 400, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }

 // 1. Idempotency Check: Zero duplicate SMS
 const { data: existingLog } = await supabase
 .from(notification_logs)
 .select(id, status, provider_message_id, created_at)
 .eq(occurrence_key, occurrenceKey)
 .maybeSingle();

 if (existingLog && existingLog.status === SENT) {
 return new Response(
 JSON.stringify({
 success: true,
 message: SMS already sent for this event occurrence,
 notificationId: existingLog.id,
 providerMessageId: existingLog.provider_message_id,
 duplicateSkipped: true,
 }),
 { status: 200, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }

 // 2. Identify Recipient Caregiver & Verify Authorization and SMS Consent
 let targetPhone = body.recipientPhone;
 let targetCaregiverId = caregiverId;

 if (!targetPhone) {
 const { data: conns } = await supabase
 .from(caregiver_connections)
 .select(
 caregiver_id,
 receives_alerts,
 caregiver:caregivers (
 id,
 phone,
 profile:profiles (phone, full_name)
 )
 )
 .eq(older_adult_id, olderAdultId)
 .eq(status, accepted)
 .eq(receives_alerts, true);

 if (conns && conns.length > 0) {
 const primaryConn = targetCaregiverId
 ? conns.find((c: any) => c.caregiver_id === targetCaregiverId) || conns[0]
 : conns[0];

 targetCaregiverId = primaryConn.caregiver_id;
 const cgObj = primaryConn.caregiver as any;
 targetPhone = cgObj?.phone || cgObj?.profile?.phone;
 }

 // Fallback: check older_adults emergency_contact_phone
 if (!targetPhone) {
 const { data: adult } = await supabase
 .from(older_adults)
 .select(emergency_contact_phone)
 .eq(id, olderAdultId)
 .maybeSingle();
 targetPhone = adult?.emergency_contact_phone;
 }
 }

 if (!targetPhone) {
 return new Response(
 JSON.stringify({
 success: false,
 error: No verified caregiver phone number found for this senior.,
 }),
 { status: 422, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }

 // 3. Format Message According to Required NESTCARE Templates
 let messageBody = customBody || ;
 if (!messageBody) {
 const timeStr = scheduledTime || scheduled time;
 if (eventType === DELAYED) {
 messageBody = NESTCARE ALERT: 's medication scheduled for has not been confirmed and is delayed. Please check the NESTCARE caregiver portal.;
 } else if (eventType === MISSED) {
 messageBody = NESTCARE ALERT: 's medication scheduled for remains unconfirmed and is marked missed. Please check the NESTCARE caregiver portal.;
 } else if (eventType === SUPPORT_REQUESTED) {
 messageBody = NESTCARE SUPPORT: has requested assistance. Please check the NESTCARE caregiver portal.;
 } else {
 messageBody = NESTCARE ALERT: Attention is required for 's routine. Please check the NESTCARE caregiver portal.;
 }
 }

 // 4. Normalize Phone Number to E.164 (e.g. +1XXXXXXXXXX, +91XXXXXXXXXX)
 let cleanPhone = targetPhone.replace(/[^\d+]/g, );
 if (!cleanPhone.startsWith(+)) {
 cleanPhone = cleanPhone.length === 10 ? +1 : +;
 }

 // 5. Check Provider Configuration
 if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
 // Record configuration missing into notification_logs accurately
 const { data: failLog } = await supabase
 .from(notification_logs)
 .upsert(
 {
 alert_id: alertId || null,
 older_adult_id: olderAdultId,
 caregiver_id: targetCaregiverId || null,
 recipient_phone: cleanPhone,
 event_type: eventType,
 occurrence_key: occurrenceKey,
 message_body: messageBody,
 status: FAILED,
 error_message: SMS Provider credentials missing in server secrets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).,
 attempts: 1,
 },
 { onConflict: occurrence_key }
 )
 .select()
 .single();

 return new Response(
 JSON.stringify({
 success: false,
 error: SMS provider credentials not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Supabase Edge Function secrets.,
 notificationLogId: failLog?.id,
 status: FAILED,
 }),
 { status: 503, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }

 // 6. Real SMS Dispatch via Twilio REST API
 const twilioUrl = https://api.twilio.com/2010-04-01/Accounts//Messages.json;
 const authHeader = Basic  + btoa(${twilioAccountSid}:);

 const params = new URLSearchParams();
 params.append(To, cleanPhone);
 params.append(From, twilioFromNumber);
 params.append(Body, messageBody);

 const twilioRes = await fetch(twilioUrl, {
 method: POST,
 headers: {
 Authorization: authHeader,
 Content-Type: application/x-www-form-urlencoded,
 },
 body: params.toString(),
 });

 const twilioData = await twilioRes.json();

 if (!twilioRes.ok) {
 const errMsg = twilioData.message || twilioData.error_message || Twilio request failed;
 await supabase
 .from(notification_logs)
 .upsert(
 {
 alert_id: alertId || null,
 older_adult_id: olderAdultId,
 caregiver_id: targetCaregiverId || null,
 recipient_phone: cleanPhone,
 event_type: eventType,
 occurrence_key: occurrenceKey,
 message_body: messageBody,
 status: FAILED,
 error_message: errMsg,
 attempts: 1,
 },
 { onConflict: occurrence_key }
 );

 return new Response(
 JSON.stringify({
 success: false,
 error: errMsg,
 providerCode: twilioData.code,
 }),
 { status: 502, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }

 // 7. Success Record in notification_logs
 const { data: successLog } = await supabase
 .from(notification_logs)
 .upsert(
 {
 alert_id: alertId || null,
 older_adult_id: olderAdultId,
 caregiver_id: targetCaregiverId || null,
 recipient_phone: cleanPhone,
 event_type: eventType,
 occurrence_key: occurrenceKey,
 message_body: messageBody,
 status: SENT,
 provider_message_id: twilioData.sid,
 attempts: 1,
 },
 { onConflict: occurrence_key }
 )
 .select()
 .single();

 return new Response(
 JSON.stringify({
 success: true,
 messageId: twilioData.sid,
 recipient: cleanPhone,
 status: SENT,
 notificationLogId: successLog?.id,
 }),
 { status: 200, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 } catch (err: any) {
 return new Response(
 JSON.stringify({ error: err?.message || Internal server error during SMS delivery }),
 { status: 500, headers: { ...corsHeaders, Content-Type: application/json } }
 );
 }
});
