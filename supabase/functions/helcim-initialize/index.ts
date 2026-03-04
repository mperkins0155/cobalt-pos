// supabase/functions/helcim-initialize/index.ts
// Creates a HelcimPay.js checkout session for card payments
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

    // Verify auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Get user's org and Helcim credentials
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: 'No profile' }), { status: 400, headers: corsHeaders });

    const { data: helcim } = await supabase.from('helcim_accounts').select('*').eq('org_id', profile.org_id).single();
    if (!helcim?.api_token) return new Response(JSON.stringify({ error: 'Helcim not configured' }), { status: 400, headers: corsHeaders });

    const { order_id, amount, currency } = await req.json();

    // Call Helcim API to initialize checkout
    const response = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-token': helcim.api_token,
      },
      body: JSON.stringify({
        paymentType: 'purchase',
        amount: amount,
        currency: currency || 'USD',
        customerCode: order_id,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Helcim init error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to initialize payment' }), { status: 502, headers: corsHeaders });
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      checkoutToken: data.checkoutToken,
      secretToken: data.secretToken,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('helcim-initialize error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
