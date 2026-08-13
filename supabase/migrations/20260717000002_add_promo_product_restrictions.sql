-- Add product-level restriction to promotions
-- Limits which products can be ordered with a promo code
ALTER TABLE public.anvat_promotions
  ADD COLUMN IF NOT EXISTS allowed_product_ids text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_discount_value integer DEFAULT NULL;

-- Update existing MOKA morning promo codes with product restrictions
-- Eligible: kem ốc quế (k1, k2) + các loại trà chanh (ft1, ft8, ft9, ft10)
UPDATE public.anvat_promotions
SET
  allowed_product_ids = ARRAY['k1','k2','ft1','ft8','ft9','ft10'],
  max_discount_value = 15000
WHERE code ILIKE 'MOKA%'
  AND is_active = true;
