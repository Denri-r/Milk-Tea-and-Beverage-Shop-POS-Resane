"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Info,
  ShoppingBag,
  Wallet,
} from "@phosphor-icons/react";
import { money } from "@/lib/money";

export default function PaymentConfirmation({
  total,
  paid,
  itemCount,
  customer,
  orderType,
  paying,
  retrying,
  error,
  onBack,
  onConfirm,
}: {
  total: number;
  paid: number;
  itemCount: number;
  customer: string;
  orderType: string;
  paying: boolean;
  retrying: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const backButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backButton.current?.focus();
  }, []);

  return (
    <div className="payment-confirmation">
      <div className="confirmation-order">
        <span className="confirmation-icon">
          <ShoppingBag size={27} weight="duotone" />
        </span>
        <div>
          <strong>{customer.trim() || "Walk-in customer"}</strong>
          <span>
            {itemCount} {itemCount === 1 ? "drink" : "drinks"} · {orderType}
          </span>
        </div>
        <span className="confirmation-method">
          <Wallet size={15} />
          Cash
        </span>
      </div>
      <div className="confirmation-summary">
        <div className="confirmation-total">
          <span>Order total</span>
          <strong>{money(total)}</strong>
        </div>
        <dl className="confirmation-amounts">
          <div>
            <dt>Cash received</dt>
            <dd>{money(paid)}</dd>
          </div>
          <div>
            <dt>Change to return</dt>
            <dd>{money(paid - total)}</dd>
          </div>
        </dl>
      </div>
      <p className="confirmation-note">
        <CheckCircle size={18} />
        <span>
          Confirm once you’ve received the cash. We’ll save the order and
          prepare the receipt.
        </span>
      </p>
      {error && (
        <p className="field-error" role="alert">
          <Info size={19} />
          {error}
        </p>
      )}
      <div className="confirmation-buttons">
        <button
          ref={backButton}
          type="button"
          className="secondary"
          disabled={paying}
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Go back
        </button>
        <button
          type="button"
          className="primary"
          disabled={paying}
          onClick={onConfirm}
        >
          {paying
            ? "Saving payment..."
            : retrying
              ? "Retry payment safely"
              : "Confirm payment"}
          {!paying && <CheckCircle size={18} />}
        </button>
      </div>
    </div>
  );
}
