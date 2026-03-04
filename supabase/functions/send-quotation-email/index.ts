import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SendRequest = {
  quotationId: string;
  toEmail?: string;
  subject?: string;
  message?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as SendRequest;
    if (!body.quotationId) {
      return new Response(JSON.stringify({ error: 'quotationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, first_name, last_name, email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'No profile found for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, org_id, quotation_number, total_amount, currency, notes, supplier:suppliers(name, email)')
      .eq('id', body.quotationId)
      .eq('org_id', profile.org_id)
      .single();

    if (quotationError || !quotation) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supplier = Array.isArray(quotation.supplier) ? quotation.supplier[0] : quotation.supplier;
    const toEmail = body.toEmail || supplier?.email;

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'Destination email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('QUOTATION_EMAIL_FROM');
    if (!resendApiKey || !fromEmail) {
      return new Response(JSON.stringify({ error: 'Missing email provider configuration (RESEND_API_KEY / QUOTATION_EMAIL_FROM)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = body.subject || `Quotation ${quotation.quotation_number} from Cobalt POS`;
    const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Cobalt POS';
    const noteBlock = quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : '';
    const customMessage = body.message ? `<p>${body.message}</p>` : '';

    const html = `
      <div>
        <p>Hello${supplier?.name ? ` ${supplier.name}` : ''},</p>
        <p>${senderName} sent you quotation <strong>${quotation.quotation_number}</strong>.</p>
        <p><strong>Total:</strong> ${quotation.total_amount} ${quotation.currency}</p>
        ${customMessage}
        ${noteBlock}
        <p>Reply to this email for next steps.</p>
      </div>
    `;

    const providerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!providerResponse.ok) {
      const providerErrorText = await providerResponse.text();
      console.error('send-quotation-email provider error:', providerErrorText);
      return new Response(JSON.stringify({ error: 'Email provider rejected request', providerError: providerErrorText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerPayload = await providerResponse.json();

    return new Response(JSON.stringify({
      sent: true,
      provider: 'resend',
      providerMessageId: providerPayload?.id,
      toEmail,
      subject,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-quotation-email error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
