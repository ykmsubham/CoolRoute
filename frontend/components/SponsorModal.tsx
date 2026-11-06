"use client";

import React, { useState } from "react";
import { X, Droplets, Armchair, HeartHandshake, CheckCircle2, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { createSponsorOrder, verifySponsor } from "@/lib/api";
import type { Node } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Props = {
  point: Node;
  onClose: () => void;
  onPaid: () => void;
};

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export default function SponsorModal({ point, onClose, onPaid }: Props) {
  const [amount, setAmount] = useState(100);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const goal = point.sponsor_goal_inr || 1000;
  const pct = goal ? Math.min(100, Math.round((point.raised_inr / goal) * 100)) : 0;

  async function pay() {
    setBusy(true);
    setMsg(null);
    try {
      const order = await createSponsorOrder(point.id, amount, name);

      if (order.mock || !order.key_id) {
        // Offline demo mode: record mock sponsorship
        await verifySponsor(order.order_id, `pay_mock_${Date.now()}`, "");
        setMsg({ ok: true, text: `Thank you! Demo contribution of ₹${amount} recorded for ${point.name}.` });
        onPaid();
        setBusy(false);
        return;
      }

      if (!(await loadCheckout()) || !window.Razorpay) {
        throw new Error("Could not load Razorpay checkout gateway");
      }

      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: "CoolRoute Campus Resilience",
        description: `Sponsor cooling & maintenance for ${order.point_name}`,
        prefill: { name },
        theme: { color: "#10b981" },
        handler: async (resp: Record<string, string>) => {
          try {
            await verifySponsor(resp.razorpay_order_id, resp.razorpay_payment_id, resp.razorpay_signature);
            setMsg({ ok: true, text: "Payment verified! Thank you for supporting campus shade & hydration." });
            onPaid();
          } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : "Verification failed" });
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });

      rzp.on("payment.failed", () => {
        setMsg({ ok: false, text: "Payment was not completed. No charges were made." });
        setBusy(false);
      });

      rzp.open();
      return;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
            {point.water ? <Droplets className="w-6 h-6" /> : <Armchair className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{point.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                {point.water ? "Water Station" : "Rest Hub"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sponsor daily refilling, solar chilling, and maintenance to keep campus pedestrians cool.
            </p>
          </div>
        </div>

        {/* Upkeep Progress Bar */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Community Upkeep Goal</span>
            <span className="text-foreground">₹{point.raised_inr} / ₹{goal}</span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{pct}% funded</span>
            <span>Tax-deductible green initiative</span>
          </div>
        </div>

        {/* Amount Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground block">
            Select Contribution Amount
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  amount === a
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card border-border hover:border-primary/40 text-foreground"
                }`}
              >
                ₹{a}
              </button>
            ))}
          </div>

          <div className="relative mt-2">
            <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
            <input
              type="number"
              min={10}
              max={100000}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Amount in rupees"
            />
          </div>
        </div>

        {/* Donor Name input */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Donor / Sponsor Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Harsh Srivastava or Anonymous"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Feedback message */}
        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              msg.ok
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/15 border border-destructive/30 text-destructive"
            }`}
          >
            {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : null}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || amount < 10}
            onClick={pay}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <HeartHandshake className="w-4 h-4" />
                Sponsor ₹{amount}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
