// supabase/functions/helcim-webhook/index.ts
// Receives webhooks from Helcim for payment events (disputes, refunds, etc.)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service role for webhook processing
    );

    const payload = await req.json();
    const eventType = payload.eventType || payload.type || 'unknown';
    const transactionId = payload.transactionId || payload.data?.transactionId;

    // Find the org by looking up the payment with this transaction ID
    let orgId: string | null = null;
    if (transactionId) {
      const { data: payment } = await supabase
        .from('payments')
        .select('org_id')
        .eq('helcim_transaction_id', String(transactionId))
        .limit(1)
        .maybeSingle();
      orgId = payment?.org_id || null;
    }

    // Store the event regardless
    await supabase.from('processor_events').insert({
      org_id: orgId,
      processor: 'helcim',
      event_type: eventType,
      event_id: transactionId ? String(transactionId) : null,
      payload,
      processed: false,
    });

    // Handle specific event types
    if (eventType === 'dispute.created' && orgId && transactionId) {
      // Find the payment and order
      const { data: payment } = await supabase
        .from('payments')
        .select('id, order_id')
        .eq('helcim_transaction_id', String(transactionId))
        .single();

      if (payment) {
        // Log audit event
        await supabase.from('audit_logs').insert({
          org_id: orgId,
          action_type: 'dispute_created',
          entity_type: 'payment',
          entity_id: payment.id,
          metadata: { transaction_id: transactionId, order_id: payment.order_id },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('helcim-webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
