-- =========================================================================
-- Add promotion limits & order-type restrictions
-- For: Daily morning free item program (5 free ice creams/lemonades per day)
-- =========================================================================

ALTER TABLE public.anvat_promotions
  ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowed_order_types text[] DEFAULT NULL;

-- max_uses = NULL      → no usage limit (backward compatible with existing promos)
-- uses_count           → tracks total redemptions
-- allowed_order_types  → NULL = all order types allowed, e.g. ARRAY['dine-in'] = dine-in only
