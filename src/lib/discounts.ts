export type DiscountType = "amount" | "percent";

export type DiscountDraft = {
  type: DiscountType;
  value: number;
};

export type DiscountSummary = {
  type: DiscountType;
  value: number;
  amount: number;
  subtotal: number;
  total: number;
};

export const DEFAULT_DISCOUNT: DiscountDraft = {
  type: "amount",
  value: 0,
};

const roundCurrency = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

export const normalizeDiscountValue = (value: number) =>
  Math.max(0, Number.isFinite(value) ? value : 0);

export const calculateDiscountSummary = (
  subtotal: number,
  discount: DiscountDraft,
): DiscountSummary => {
  const safeSubtotal = Math.max(0, roundCurrency(subtotal));
  const safeValue = normalizeDiscountValue(discount.value);
  const rawAmount =
    discount.type === "percent" ? (safeSubtotal * Math.min(safeValue, 100)) / 100 : safeValue;
  const amount = Math.min(safeSubtotal, roundCurrency(rawAmount));
  const total = Math.max(0, safeSubtotal - amount);

  return {
    type: discount.type,
    value: safeValue,
    amount,
    subtotal: safeSubtotal,
    total,
  };
};
