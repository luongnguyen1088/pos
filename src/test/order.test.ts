import { describe, it, expect } from "vitest";

// Core POS calculation helper functions for Unit Testing
export interface OrderItemInput {
  price: number;
  quantity: number;
}

export function calculateSubtotal(items: OrderItemInput[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateDiscount(
  subtotal: number,
  discountType?: "amount" | "percent" | null,
  discountValue: number = 0
): number {
  if (!discountType || discountValue <= 0) return 0;
  if (discountType === "percent") {
    const amount = Math.round((subtotal * discountValue) / 100);
    return Math.min(amount, subtotal);
  }
  return Math.min(discountValue, subtotal);
}

export function calculateGrandTotal(
  subtotal: number,
  discountAmount: number
): number {
  return Math.max(0, subtotal - discountAmount);
}

export function formatOrderNumber(rawNumber: string | number): string {
  const digits = String(rawNumber).replace(/\D/g, "");
  return `#${digits}`;
}

describe("POS Order Business Logic Unit Tests", () => {
  describe("calculateSubtotal", () => {
    it("should return 0 for empty cart", () => {
      expect(calculateSubtotal([])).toBe(0);
    });

    it("should correctly compute total price of items", () => {
      const cart = [
        { price: 25000, quantity: 2 }, // 50000
        { price: 30000, quantity: 1 }, // 30000
      ];
      expect(calculateSubtotal(cart)).toBe(80000);
    });
  });

  describe("calculateDiscount", () => {
    it("should return 0 when no discount applied", () => {
      expect(calculateDiscount(100000, null, 0)).toBe(0);
    });

    it("should calculate fixed amount discount correctly", () => {
      expect(calculateDiscount(100000, "amount", 15000)).toBe(15000);
    });

    it("should calculate percentage discount correctly", () => {
      expect(calculateDiscount(100000, "percent", 10)).toBe(10000);
    });

    it("should cap discount at subtotal amount", () => {
      expect(calculateDiscount(50000, "amount", 75000)).toBe(50000);
      expect(calculateDiscount(50000, "percent", 150)).toBe(50000);
    });
  });

  describe("calculateGrandTotal", () => {
    it("should subtract discount from subtotal", () => {
      expect(calculateGrandTotal(100000, 20000)).toBe(80000);
    });

    it("should not return negative total", () => {
      expect(calculateGrandTotal(50000, 60000)).toBe(0);
    });
  });

  describe("formatOrderNumber", () => {
    it("should format clean order number string", () => {
      expect(formatOrderNumber("88854860")).toBe("#88854860");
      expect(formatOrderNumber("#88854860")).toBe("#88854860");
      expect(formatOrderNumber(1234)).toBe("#1234");
    });
  });
});
