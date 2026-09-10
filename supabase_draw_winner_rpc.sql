-- =============================================================
-- VALUE.NET — draw_giveaway_winner RPC
-- Run this once in the Supabase SQL editor
-- =============================================================
-- IDEMPOTENCY: returns existing winner if already drawn
-- WEIGHTED RNG: ORDER BY random() * weight DESC
-- SECURITY: SECURITY DEFINER for elevated write access
-- =============================================================

CREATE OR REPLACE FUNCTION draw_giveaway_winner(p_giveaway_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id        UUID;
  v_username         TEXT;
  v_display_name     TEXT;
  v_avatar_url       TEXT;
  v_existing_winner  UUID;
BEGIN
  -- 1. Idempotency guard: return existing winner if already drawn
  SELECT winner_id INTO v_existing_winner
  FROM giveaways WHERE id = p_giveaway_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found.');
  END IF;

  IF v_existing_winner IS NOT NULL THEN
    SELECT p.username, p.display_name, p.avatar_url
      INTO v_username, v_display_name, v_avatar_url
    FROM profiles p WHERE p.id = v_existing_winner;
    RETURN jsonb_build_object(
      'success', true, 'already_drawn', true,
      'winner_id', v_existing_winner,
      'username', COALESCE(v_username, 'winner'),
      'display_name', COALESCE(v_display_name, v_username, 'winner'),
      'avatar_url', COALESCE(v_avatar_url, 'person')
    );
  END IF;

  -- 2. Weighted random selection from giveaway_entries
  SELECT e.user_id INTO v_winner_id
  FROM giveaway_entries e
  WHERE e.giveaway_id = p_giveaway_id
  ORDER BY random() * COALESCE(e.weight, 1.0) DESC
  LIMIT 1;

  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible entrants in this drop.');
  END IF;

  -- 3. Resolve winner profile
  SELECT p.username, p.display_name, p.avatar_url
    INTO v_username, v_display_name, v_avatar_url
  FROM profiles p WHERE p.id = v_winner_id;

  -- 4. Atomically persist winner + update status
  UPDATE giveaways SET
    winner_id           = v_winner_id,
    winner_username     = COALESCE(v_username, 'winner'),
    winner_display_name = COALESCE(v_display_name, v_username, 'winner'),
    winner_avatar       = COALESCE(v_avatar_url, 'person'),
    status              = 'COMPLETED',
    completed_at        = NOW(),
    updated_at          = NOW()
  WHERE id = p_giveaway_id;

  RETURN jsonb_build_object(
    'success', true, 'already_drawn', false,
    'winner_id', v_winner_id,
    'username', COALESCE(v_username, 'winner'),
    'display_name', COALESCE(v_display_name, v_username, 'winner'),
    'avatar_url', COALESCE(v_avatar_url, 'person')
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION draw_giveaway_winner(UUID) TO authenticated;
