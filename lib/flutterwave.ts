"use client";

type FlutterwavePaymentConfig = {
  publicKey: string;
  amount: number;
  currency?: string;
  email: string;
  userId: string;
  plan: string;
  billingCycle: string;
  onSuccess: (response: any) => void;
  onClose: () => void;
};

export function initFlutterwavePayment({
  publicKey,
  amount,
  currency = "NGN",
  email,
  userId,
  plan,
  billingCycle,
  onSuccess,
  onClose,
}: FlutterwavePaymentConfig) {
  // @ts-ignore - Flutterwave script loaded globally
  const FlutterwaveCheckout = window.FlutterwaveCheckout;
  
  if (!FlutterwaveCheckout) {
    console.error("Flutterwave script not loaded");
    return;
  }

  const tx_ref = `lumio-${userId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  FlutterwaveCheckout({
    public_key: publicKey,
    tx_ref,
    amount,
    currency,
    customer: { email },
    meta: { userId, plan, billingCycle },
    customizations: {
      title: "Lumio Subscription",
      description: `${plan} plan — ${billingCycle}`,
    },
    callback: onSuccess,
    onclose: onClose,
  });
}
