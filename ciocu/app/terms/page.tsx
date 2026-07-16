import type { Metadata } from "next";
import styles from "../legal.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Everything below describes how Ciocu actually behaves. Two things are still
// deliberately absent and should be added once the legal entity exists:
//   - a trader postal address (EU consumer law expects one)
//   - a governing-law / jurisdiction clause (section removed for now)
// Have a lawyer review this page before relying on it.
const OPERATOR = "Ciocu";
const EFFECTIVE_DATE = "14 July 2026";
const SUPPORT_EMAIL = "info@ciocu.app";
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Terms of Use — Ciocu",
  description: "The terms that apply when you use Ciocu.",
  alternates: { canonical: "https://ciocu.app/terms" },
};

export default function TermsPage() {
  return (
    <main className={`doc-shell ${styles.page}`}>
      <article className={styles.doc}>
        <header className={styles.head}>
          <a className={styles.back} href="https://ciocu.app">
            ← Ciocu
          </a>
          <h1>Terms of Use</h1>
          <p className={styles.meta}>Effective {EFFECTIVE_DATE}</p>
        </header>

        <p className={styles.lede}>
          These terms are a plain-language agreement between you and {OPERATOR} (“we”, “us”) about
          your use of Ciocu at ciocu.app. Please read them — by using Ciocu you accept them.
        </p>

        <h2>1. Who we are</h2>
        <p>
          Ciocu is the AI companion service at ciocu.app. For anything relating to these terms —
          your subscription, your data, or a complaint — contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>2. What Ciocu is — and what it isn’t</h2>
        <p>
          Ciocu is an AI companion. She responds in writing, reacts to your presence, and can
          remember things you tell her. She is software producing generated text.
        </p>
        <p>
          <strong>
            Ciocu is not a therapist, doctor, lawyer, or crisis service, and nothing she says is
            professional advice.
          </strong>{" "}
          She does not diagnose or treat anything. If you are in crisis or need medical, legal, or
          financial help, contact a qualified professional or your local emergency services. Never
          delay seeking professional help because of something Ciocu said.
        </p>

        <h2>3. Who may use Ciocu</h2>
        <p>
          You must be old enough to agree to these terms where you live, and to meet your country’s
          minimum age for using online services (in much of the EU that is 16, or 13 with a parent’s
          consent).
        </p>

        <h2>4. Your account</h2>
        <p>
          You can try Ciocu without an account. To subscribe or sync across devices you sign in with
          Google — we never create or hold a password for you. Keep access to your Google account
          secure; anything done through your signed-in session is treated as done by you. Tell us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you believe your account has
          been misused.
        </p>

        <h2>5. Plans, energy and top-ups</h2>
        <p>
          Ciocu offers a free tier with a limited number of messages, and paid monthly plans that
          include a monthly allowance of “energy” (credits). Current plans and prices are shown in
          the app before you pay.
        </p>
        <ul>
          <li>
            <strong>Energy is a usage allowance, not money.</strong> Credits have no cash value,
            cannot be exchanged, transferred, or withdrawn, and are not a stored-value instrument.
          </li>
          <li>
            <strong>Energy does not roll over.</strong> Your allowance — including any top-ups —
            resets on your renewal date and unused credits expire.
          </li>
          <li>
            <strong>Top-ups</strong> are one-time purchases that add energy to your current billing
            period only. They expire with that period.
          </li>
          <li>
            To protect your balance, voice may pause automatically when your energy runs low while
            text continues to work. This is intended behaviour, not a fault.
          </li>
        </ul>
        <p>
          We may adjust prices, plan allowances, and how activities consume energy. Changes to a
          running subscription’s price take effect from your next renewal, and we will tell you
          beforehand.
        </p>

        <h2>6. Payment, renewal and cancellation</h2>
        <p>
          Payments are handled by Lemon Squeezy, which acts as merchant of record and seller for
          your purchase. Their terms and privacy policy apply to the transaction itself, and the
          charge appears on your statement under their name. We never see or store your card
          details.
        </p>
        <p>
          Subscriptions are billed in US dollars and renew automatically each month until cancelled.
          You can cancel at any time from the customer portal linked in your receipt email, or by
          contacting us; cancelling stops future renewals and you keep access until the end of the
          period you have already paid for. We do not automatically refund partly-used periods.
        </p>

        <h2>7. Right of withdrawal and refunds</h2>
        <p>
          If you are a consumer in the EU/EEA, you have 14 days to withdraw from a purchase of
          digital services. We honour that: write to us within 14 days of your payment and we will
          refund it.
        </p>
        <p>
          Beyond that, refund requests are handled case by case, in line with Lemon Squeezy’s policy.
          Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the email you
          subscribed with and your receipt. Nothing in these terms limits your statutory consumer
          rights.
        </p>

        <h2>8. Knowledge bases and generated content</h2>
        <p>
          Knowledge bases are optional reference libraries you can switch on. Every base is off by
          default, and you can switch one off again at any time.
        </p>
        <p>
          Generated answers may be inaccurate, incomplete, or out of date, even when drawing on a
          knowledge base. Ciocu can be wrong. Use your judgement, and don’t treat her output as fact
          or as professional guidance.
        </p>

        <h2>9. How you may use Ciocu</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use Ciocu for anything unlawful, or to harm, harass, or exploit anyone;</li>
          <li>attempt to generate sexual content involving minors, or content that sexualises them
            in any way;</li>
          <li>use Ciocu to obtain instructions for violence, weapons, or serious wrongdoing;</li>
          <li>break, probe, overload, or circumvent the service, its limits, or its billing —
            including tampering with usage accounting;</li>
          <li>resell, scrape, or redistribute the service or its content, or use it to build a
            competing product;</li>
          <li>impersonate anyone, or upload other people’s personal data without a lawful basis.</li>
        </ul>
        <p>
          We may suspend or end access that breaks these rules, and must comply with law where
          required.
        </p>

        <h2>10. Your memory and your data</h2>
        <p>
          Ciocu’s memory is local-first: it lives in your browser on your device. You can export a
          complete copy at any time from the menu, and import it again — it is yours. If you
          subscribe, memory can also sync across your devices through your account.
        </p>
        <p>
          Camera-based attention runs entirely on your device: no video or images are uploaded or
          stored, and speech recognition only runs while Ciocu can see that you are present. Your
          memory is not sold, and is not used to build an advertising profile.
        </p>
        <p>
          How we handle personal data is described in our <a href="/privacy">Privacy Policy</a>,
          which forms part of these terms.
        </p>

        <h2>11. Ownership</h2>
        <p>
          Ciocu — the software, her design, her eyes, the wordmark and the curated knowledge bases —
          belongs to us and our licensors. You get a personal, non-exclusive, non-transferable right
          to use the service while these terms are met.
        </p>
        <p>
          What you write to Ciocu stays yours. You grant us only the permission needed to run the
          service for you: to process your messages, generate replies, and store your memory as
          described above.
        </p>

        <h2>12. Availability and changes</h2>
        <p>
          Ciocu is a young product and is provided as-is. We may change, suspend, or discontinue
          features, and there may be downtime or interruptions. If we discontinue the service
          entirely, we will give reasonable notice so you can export your memory first.
        </p>

        <h2>13. Ending this agreement</h2>
        <p>
          You can stop using Ciocu at any time — cancel your subscription and, if you wish, clear the
          site’s data to remove your local memory. Export it first if you want to keep it. We may
          suspend or terminate access if you materially breach these terms, or where the law requires
          it.
        </p>

        <h2>14. Disclaimers and liability</h2>
        <p>
          To the extent the law allows, Ciocu is provided without warranties of any kind: we do not
          promise it will be uninterrupted, error-free, accurate, or suited to a particular purpose.
        </p>
        <p>
          To the extent the law allows, we are not liable for indirect or consequential loss, lost
          profits, or lost data, and our total liability for any claim relating to the service is
          limited to the greater of the amount you paid us in the twelve months before the claim, or
          fifty US dollars.
        </p>
        <p>
          Nothing here excludes liability that cannot lawfully be excluded — including for death or
          personal injury caused by negligence, for fraud, or your mandatory rights as a consumer.
        </p>

        <h2>15. Changes to these terms</h2>
        <p>
          We may update these terms as Ciocu develops. If a change materially affects you, we will
          give reasonable notice — by email or in the app — before it takes effect. Continuing to use
          Ciocu after that means you accept the updated terms. The effective date is always shown at
          the top of this page.
        </p>

        <h2>16. Your rights as a consumer</h2>
        <p>
          If you are a consumer, you keep the protection of the mandatory laws of the country where
          you live, and you may bring proceedings there. Nothing in these terms takes those rights
          away.
        </p>

        <h2>17. Contact</h2>
        <p>
          Questions about these terms, your subscription, or your data:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <footer className={styles.foot}>
          <span>© {new Date().getFullYear()} Ciocu</span>
          <a href="/privacy">Privacy Policy</a>
        </footer>
      </article>
    </main>
  );
}
