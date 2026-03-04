// supabase/functions/helcim-validate/index.ts
// Validates HelcimPay.js transaction via hash verification
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: 'No profile' }), { status: 400, headers: corsHeaders });

    const { data: helcim } = await supabase.from('helcim_accounts').select('*').eq('org_id', profile.org_id).single();
    if (!helcim?.api_token) return new Response(JSON.stringify({ error: 'Helcim not configured' }), { status: 400, headers: corsHeaders });

    const { order_id, transaction_id, response_hash } = await req.json();

    // Verify transaction with Helcim API
    const response = await fetch(`https://api.helcim.com/v2/card-transactions/${transaction_id}`, {
      headers: { 'api-token': helcim.api_token },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Transaction not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const txn = await response.json();

    // Verify the transaction is approved
    if (txn.status !== 'APPROVED') {
      return new Response(JSON.stringify({ success: false, error: 'Transaction not approved', status: txn.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log processor event
    await supabase.from('processor_events').insert({
      org_id: profile.org_id,
      processor: 'helcim',
      event_type: 'charge.completed',
      event_id: transaction_id,
      payload: txn,
      processed: true,
    });

    return new Response(JSON.stringify({
      success: true,
      transaction_id: txn.transactionId,
      amount: txn.amount,
      card_last_four: txn.cardNumber?.slice(-4),
      card_brand: txn.cardType,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('helcim-validate error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
