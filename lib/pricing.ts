export const PRICING = {
  STANDARD: {
    MONTHLY:   { amount: 1500,  label: "₦1,500/mo" },
    QUARTERLY: { amount: 4050,  label: "₦4,050/qtr" },
    YEARLY:    { amount: 14400, label: "₦14,400/yr" },
  },
  PREMIUM: {
    MONTHLY:   { amount: 3000,  label: "₦3,000/mo" },
    QUARTERLY: { amount: 8100,  label: "₦8,100/qtr" },
    YEARLY:    { amount: 28800, label: "₦28,800/yr" },
  },
} as const

export type PlanKey = keyof typeof PRICING
export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY"

export function computeExpiryDate(billingCycle: BillingCycle, from: Date): Date {
  const date = new Date(from)
  switch (billingCycle) {
    case "MONTHLY":   date.setMonth(date.getMonth() + 1);  break
    case "QUARTERLY": date.setMonth(date.getMonth() + 3);  break
    case "YEARLY":    date.setFullYear(date.getFullYear() + 1); break
  }
  return date
}
