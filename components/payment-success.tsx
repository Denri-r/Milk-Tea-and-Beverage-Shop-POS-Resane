"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Receipt as ReceiptIcon } from "@phosphor-icons/react";
import { money } from "@/lib/money";
import type { Receipt } from "@/lib/types";

export default function PaymentSuccess({
  receipt,
  onViewReceipt,
  onNewTransaction,
}: {
  receipt: Receipt;
  onViewReceipt: () => void;
  onNewTransaction: () => void;
}) {
  const receiptButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    receiptButton.current?.focus();
  }, []);

  return (
    <div className="payment-success">
      <div className="success-change">
        <span>Change to return</span>
        <strong>{money(receipt.change)}</strong>
        <p>
          {receipt.change === 0
            ? "Exact amount received. You’re all settled."
            : "Hand this amount back to the customer."}
        </p>
      </div>
      <dl className="success-payment-details">
        <div>
          <dt>Order total</dt>
          <dd>{money(receipt.total)}</dd>
        </div>
        <div>
          <dt>Cash received</dt>
          <dd>{money(receipt.paid)}</dd>
        </div>
      </dl>
      <div className="success-reference">
        <ReceiptIcon size={16} aria-hidden="true" />
        <span>{receipt.reference}</span>
      </div>
      <div className="success-actions">
        <button
          ref={receiptButton}
          type="button"
          className="secondary"
          onClick={onViewReceipt}
        >
          <ReceiptIcon size={18} />
          View receipt
        </button>
        <button type="button" className="primary" onClick={onNewTransaction}>
          New transaction
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
