import { forwardRef, useImperativeHandle, useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { BRAND, RED } from "@/shared/constants";
import { inputBase, labelBase } from "@/shared/utils/styles";

/**
 * Real Stripe Elements card entry — replaces the earlier demo form now that
 * `fetchPaymentPublishableKey`/`postPaymentInitiate`/`postPaymentConfirm`
 * call `ins` for real (see `Payment/api/paymentApi`). Card data goes
 * straight to Stripe via `CardNumberElement`/etc. and never touches this
 * app's own code or storage. Ported from `Q2BNfy`'s `PaymentCardField.jsx`
 * verbatim — same imperative interface (`createPaymentMethod()` /
 * `confirmCardPayment()`), so `PaymentPage.jsx`'s pay-and-bind sequence
 * needed no changes beyond wrapping this in `<Elements>`.
 */
type CardFieldKey = "number" | "expiry" | "cvc";

export interface PaymentCardFieldHandle {
  createPaymentMethod: () => Promise<any>;
  confirmCardPayment: (clientSecret: string) => Promise<any>;
}

interface PaymentCardFieldProps {
  disabled?: boolean;
  billingDetails?: any;
  onCompleteChange: (complete: boolean) => void;
  onErrorChange: (error: string | null) => void;
}

export const PaymentCardField = forwardRef<PaymentCardFieldHandle, PaymentCardFieldProps>(
  function PaymentCardField({ disabled, billingDetails, onCompleteChange, onErrorChange }, ref) {
    const stripe = useStripe();
    const elements = useElements();
    const [focusedField, setFocusedField] = useState<CardFieldKey | null>(null);
    const [complete, setComplete] = useState<Record<CardFieldKey, boolean>>({
      number: false,
      expiry: false,
      cvc: false,
    });
    const [errors, setErrors] = useState<Record<CardFieldKey, string | null>>({
      number: null,
      expiry: null,
      cvc: null,
    });

    const stripeElementOptions: any = {
      disabled,
      style: {
        base: {
          color: "#1a1a1a",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          "::placeholder": { color: "#767676" },
        },
        invalid: { color: RED },
      },
    };
    const stripeNumberOptions = { ...stripeElementOptions, showIcon: true };

    const stripeInputStyle = (field: CardFieldKey) => ({
      ...inputBase,
      padding: "13px 14px",
      borderColor: errors[field] ? RED : focusedField === field ? BRAND : "#d0d0d0",
      opacity: disabled ? 0.6 : 1,
    });

    const handleElementChange = (field: CardFieldKey) => (event: any) => {
      const message = event.error?.message || null;
      const nextComplete = { ...complete, [field]: Boolean(event.complete) };
      const nextErrors = { ...errors, [field]: message };

      setComplete(nextComplete);
      setErrors(nextErrors);
      onCompleteChange(Object.values(nextComplete).every(Boolean));
      onErrorChange(nextErrors.number || nextErrors.expiry || nextErrors.cvc);
    };

    useImperativeHandle(
      ref,
      () => ({
        async createPaymentMethod() {
          if (!stripe || !elements)
            throw new Error("Stripe is still loading. Please try again in a moment.");
          const card = elements.getElement(CardNumberElement);
          if (!card) throw new Error("Card entry is not ready. Please refresh and try again.");
          const result = await stripe.createPaymentMethod({
            type: "card",
            card,
            billing_details: billingDetails,
          });
          if (result.error)
            throw new Error(result.error.message || "Payment method could not be created.");
          return result.paymentMethod;
        },
        async confirmCardPayment(clientSecret: string) {
          if (!stripe) throw new Error("Stripe is still loading. Please try again in a moment.");
          const result = await stripe.confirmCardPayment(clientSecret);
          if (result.error) throw new Error(result.error.message || "Payment confirmation failed.");
          return result.paymentIntent;
        },
      }),
      [stripe, elements, billingDetails],
    );

    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={stripeInputStyle("number")}>
          <CardNumberElement
            onFocus={() => setFocusedField("number")}
            onBlur={() => setFocusedField(null)}
            onChange={handleElementChange("number")}
            options={stripeNumberOptions}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {/* The Stripe Element is nested inside its <label> — it renders a
            cross-origin iframe that a `htmlFor`/`id` pair can't reach, so
            containment is the only association that works. */}
          <label style={{ ...labelBase, marginBottom: 5, display: "block" }}>
            Expiration date
            <div style={{ ...stripeInputStyle("expiry"), marginTop: 5 }}>
              <CardExpiryElement
                onFocus={() => setFocusedField("expiry")}
                onBlur={() => setFocusedField(null)}
                onChange={handleElementChange("expiry")}
                options={stripeElementOptions}
              />
            </div>
          </label>
          <label style={{ ...labelBase, marginBottom: 5, display: "block" }}>
            CVV
            <div style={{ ...stripeInputStyle("cvc"), marginTop: 5 }}>
              <CardCvcElement
                onFocus={() => setFocusedField("cvc")}
                onBlur={() => setFocusedField(null)}
                onChange={handleElementChange("cvc")}
                options={stripeElementOptions}
              />
            </div>
          </label>
        </div>
      </div>
    );
  },
);
