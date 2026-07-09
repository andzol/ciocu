# Ciocu — Usage Metering & Pricing Methodology

_Last updated: 2026-07-09. This is the single source of truth for **how we count usage** and **how the tiers are priced**. Numbers marked ⚠️ are assumptions still to be confirmed._

---

## 1. The unit: the "credit"

Everything a user does costs us money in **different units** — Soniox speech-to-text is billed per **hour**, DeepSeek is billed per **token**. To give the user one simple monthly allowance, we convert every activity into a single internal unit:

> **1 credit = $0.01 (one cent) of real vendor cost.**

Credits are an *internal cost accounting* unit. Users never see "tokens" — they see a friendly allowance / energy meter (see §7).

---

## 2. Rate card (activity → credits)

| Activity | Vendor | Vendor cost | In credits |
|---|---|---|---|
| **Voice / speech-to-text** | Soniox | $0.30 / hour = $0.005 / min ⚠️ | **0.5 credits / min** (30 / hr) |
| **Chat reply** | DeepSeek V4 Pro (via OpenRouter) | ~$0.001 / message ⚠️ (~2k in + ~300 out tokens) | **~0.10 credits / message** |
| **Mood read + memory reflect** (background) | DeepSeek V4 Flash | ~$0.0003 / turn | **~0.03 credits / turn** |
| **Embeddings** (recall / memory) | on-device (multilingual-e5-small) | $0.00 | **0 credits** |

**The dominant cost is voice.** STT is ~95% of variable cost. One hour of talking ≈ the cost of ~230 text messages. This is why the whole model is robust even if the DeepSeek price guess is off — and why voice is the thing we meter most carefully.

⚠️ **To confirm:** (a) Soniox **real-time / streaming** rate (may exceed the $0.30/hr async rate); (b) DeepSeek **V4 Pro** exact input/output token price on OpenRouter.

---

## 3. What we count (and what we don't)

**Metering formula, per interaction:**

```
credits = (STT_seconds / 3600 × 30)     ← voice (active streamed audio only)
        + (chat_messages   × 0.10)      ← her reply
        + (turns           × 0.03)      ← mood read + memory reflect overhead
```

**Key rule — bill active audio, not wall-clock time.** Ciocu's mic is *attention-gated*: speech-to-text only streams while the user is actually looking at her eyes and speaking. We meter the **actual streamed audio seconds**, NOT "time the app was open." This cuts real STT cost ~3–5× vs. an always-on mic and is the single biggest cost lever we already have built in.

**Free (0 credits):** embeddings, memory recall, memory storage, eye rendering, idle time, reading her replies.

---

## 4. Tiers & allowances

Two subscription tiers. Allowances are derived from the profit target in §5, then **rounded down** for a safety buffer.

| | Basic | Pro |
|---|---|---|
| **Price** | **$19.99 / mo** | **$99.99 / mo** |
| Lemon Squeezy checkout | `.../checkout/buy/7578c2f4-1557-49e3-886f-2d9ce0cb870f` | _(second tier URL TBD)_ |
| **Monthly allowance** | **800 credits** | **4,400 credits** |
| ≈ voice-heavy use | ~24 hrs/mo (~45 min/day) | ~125 hrs/mo (~4 hr/day) |
| ≈ text-heavy use | ~6,000+ messages | ~34,000 messages |

Users can mix voice and text freely — it's one credit pool that both draw from.

---

## 5. The pricing model — 50% profit target

Target: **owner keeps 50% of the gross sticker price** as profit, after the payment fee, with vendor costs capped to fit.

**Lemon Squeezy fee:** 5% + $0.50 per transaction (Merchant of Record — also handles EU VAT and holds the customer/email list).

**Cost budget formula:**

```
vendor_cost_budget = 0.45 × price − $0.50
                   = price − (50% profit) − (5% × price + $0.50 LS fee)
```

**Worked example:**

| | Basic ($19.99) | Pro ($99.99) |
|---|---|---|
| LS fee (5% + $0.50) | $1.50 | $5.50 |
| **Profit (50% of price)** | **$9.99** | **$49.99** |
| Vendor cost budget | $8.50 | $44.50 |
| Budget in credits (÷ $0.01) | 850 | 4,450 |
| **Allowance (rounded down)** | **800** | **4,400** |

Check: `19.99 − 1.50 − 8.50 = 9.99` ✓ and `99.99 − 5.50 − 44.50 = 49.99` ✓

---

## 6. Honest caveats about the "50%"

1. **This is contribution margin, not take-home.** It's 50% *after payment + AI/STT costs* but *before* fixed costs (Vercel hosting, domain, your time) and *before* income tax. Real net profit is lower.
2. **Realized margin is usually higher than 50%.** The budget assumes a user burns their *entire* allowance. Most won't — unused credits ("breakage") are pure margin. So 50% is the worst-case floor for a power user; the average customer nets well above it.
3. **Robust to LLM price changes.** Because voice/STT dominates (~95% of cost) and uses the confirmed $0.30/hr figure, the allowances hold even if the DeepSeek token price differs from the estimate.

---

## 7. Policies (recommended)

- **Presentation:** show a single "energy" meter that drains, or express limits as "~X hours of voice + effectively unlimited text." Never expose raw token counts.
- **Overage:** when the meter runs low, **throttle voice → text-only** rather than cutting her off — she never goes fully silent. (Alternative: "buy more credits" top-ups.)
- **Rollover:** **none.** Credits reset monthly. Keeps our cost exposure predictable.
- **Positioning option:** since text is so cheap, consider **Basic = text-first with a voice cap** and **Pro = voice-heavy/unlimited**, aligning cost to price even more tightly.

---

## 8. Open items

- [ ] Confirm Soniox real-time streaming rate (currently ⚠️ $0.30/hr).
- [ ] Confirm DeepSeek V4 Pro token price on OpenRouter.
- [ ] Create the **Pro ($99.99)** product in Lemon Squeezy and capture its buy URL.
- [x] Build `lib/usage` credit ledger — `lib/usage/rates.ts` (rate card) + `lib/usage/ledger.ts`
  (IndexedDB `ciocu-usage`, monthly rollover, drain, `canUseVoice()` throttle, `useUsage()` hook).
  Text path is wired in `app/page.tsx` (`recordTurn` on send, `recordChatMessage` on reply) and
  verified draining at the correct rates. **Still to wire:** `recordVoiceSeconds()` when Soniox
  STT lands; `setTier()` driven by verified subscription status; a meter UI consuming `useUsage()`.
- [ ] Server-authoritative enforcement + align period reset to the Lemon Squeezy renewal date
  (current reset is calendar-month, client-side — see the SCOPE note in `ledger.ts`).
- [ ] Decide Basic-tier voice cap (if going with the text-first split in §7).
