-- COBALT POS — Quotation Workflow Hardening
-- Adds send/status workflow metadata + transactional status transition RPC with audit logging.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS sent_to_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS sent_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sent_provider_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profiles(id);

CREATE OR REPLACE FUNCTION transition_quotation_status(
  p_quotation_id UUID,
  p_new_status quotation_status,
  p_actor_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS quotations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotations%ROWTYPE;
  v_previous_status quotation_status;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_quote
  FROM quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation % not found', p_quotation_id;
  END IF;

  v_previous_status := v_quote.status;

  IF p_new_status = v_previous_status THEN
    RETURN v_quote;
  END IF;

  IF NOT (
    (v_previous_status = 'draft' AND p_new_status IN ('sent', 'accepted', 'rejected', 'expired', 'converted'))
    OR (v_previous_status = 'sent' AND p_new_status IN ('accepted', 'rejected', 'expired', 'converted'))
    OR (v_previous_status = 'accepted' AND p_new_status IN ('converted', 'rejected'))
    OR (v_previous_status = 'rejected' AND p_new_status IN ('draft'))
    OR (v_previous_status = 'expired' AND p_new_status IN ('draft'))
  ) THEN
    RAISE EXCEPTION 'Invalid quotation status transition: % -> %', v_previous_status, p_new_status;
  END IF;

  UPDATE quotations
  SET
    status = p_new_status,
    sent_at = CASE WHEN p_new_status = 'sent' THEN COALESCE(sent_at, v_now) ELSE sent_at END,
    sent_to_email = CASE
      WHEN p_new_status = 'sent' THEN COALESCE(NULLIF(p_metadata->>'to_email', ''), sent_to_email)
      ELSE sent_to_email
    END,
    sent_by = CASE WHEN p_new_status = 'sent' AND p_actor_user_id IS NOT NULL THEN p_actor_user_id ELSE sent_by END,
    sent_provider = CASE
      WHEN p_new_status = 'sent' THEN COALESCE(NULLIF(p_metadata->>'provider', ''), sent_provider)
      ELSE sent_provider
    END,
    sent_provider_message_id = CASE
      WHEN p_new_status = 'sent' THEN COALESCE(NULLIF(p_metadata->>'provider_message_id', ''), sent_provider_message_id)
      ELSE sent_provider_message_id
    END,
    accepted_at = CASE WHEN p_new_status = 'accepted' THEN COALESCE(accepted_at, v_now) ELSE accepted_at END,
    rejected_at = CASE WHEN p_new_status = 'rejected' THEN COALESCE(rejected_at, v_now) ELSE rejected_at END,
    status_reason = CASE
      WHEN p_new_status = 'rejected' THEN COALESCE(NULLIF(p_metadata->>'reason', ''), status_reason)
      WHEN p_new_status = 'accepted' THEN NULL
      ELSE status_reason
    END,
    status_changed_at = v_now,
    status_changed_by = COALESCE(p_actor_user_id, status_changed_by),
    updated_at = v_now
  WHERE id = p_quotation_id
  RETURNING * INTO v_quote;

  INSERT INTO audit_logs (
    org_id,
    actor_user_id,
    action_type,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_quote.org_id,
    p_actor_user_id,
    'quotation_status_changed',
    'quotation',
    v_quote.id,
    jsonb_build_object(
      'from_status', v_previous_status,
      'to_status', p_new_status
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  IF p_new_status = 'sent' THEN
    INSERT INTO audit_logs (
      org_id,
      actor_user_id,
      action_type,
      entity_type,
      entity_id,
      metadata
    )
    VALUES (
      v_quote.org_id,
      p_actor_user_id,
      'quotation_sent',
      'quotation',
      v_quote.id,
      jsonb_build_object(
        'to_email', COALESCE(NULLIF(p_metadata->>'to_email', ''), v_quote.sent_to_email),
        'provider', NULLIF(p_metadata->>'provider', ''),
        'provider_message_id', NULLIF(p_metadata->>'provider_message_id', '')
      )
    );
  END IF;

  RETURN v_quote;
END;
$$;

GRANT EXECUTE ON FUNCTION transition_quotation_status(UUID, quotation_status, UUID, JSONB) TO authenticated;
