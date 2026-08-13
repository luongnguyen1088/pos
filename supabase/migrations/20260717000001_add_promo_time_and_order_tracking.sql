-- =========================================================================
-- Add time window to promotions + promo_code tracking to orders
-- For: Daily morning free item program conditions
-- =========================================================================

-- 1. Time window for promo validity (e.g. "07:00" to "12:00")
ALTER TABLE public.anvat_promotions
  ADD COLUMN IF NOT EXISTS valid_from_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_to_time   text DEFAULT NULL;

-- 2. Track which promo code was used per order (for weekly per-phone limit)
ALTER TABLE public.anvat_orders
  ADD COLUMN IF NOT EXISTS promo_code text DEFAULT NULL;

-- 3. Index for efficient weekly phone+promo lookups
CREATE INDEX IF NOT EXISTS idx_anvat_orders_promo_phone
  ON public.anvat_orders (customer_phone, promo_code, created_at)
  WHERE promo_code IS NOT NULL;
