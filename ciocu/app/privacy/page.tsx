import type { Metadata } from "next";
import styles from "../legal.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// This describes Ciocu's real data flows (verified against the code): what stays
// on-device, what leaves, and to whom. Two gaps to close once the legal entity
// exists:
//   - a controller postal address (GDPR Art. 13 expects identity + contact)
//   - a supervisory authority named for complaints
// Have a lawyer review before relying on it.
const CONTROLLER = "Ciocu";
const EFFECTIVE_DATE = "14 July 2026";
const SUPPORT_EMAIL = "info@ciocu.app";
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Privacy Policy — Ciocu",
  description: "What Ciocu collects, where it goes, and what stays on your device.",
  alternates: { canonical: "https://ciocu.app/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className={`doc-shell ${styles.page}`}>
      <article className={styles.doc}>
        <header className={styles.head}>
          <a className={styles.back} href="https://ciocu.app">
            ← Ciocu
          </a>
          <h1>Privacy Policy</h1>
          <p className={styles.meta}>Effective {EFFECTIVE_DATE}</p>
        </header>

        <p className={styles.lede}>
          Ciocu is built so that the intimate part of your relationship with her — her memory of you
          — lives on your device, not ours. This page explains exactly what that means, what has to
          leave your device for her to work, and who sees it.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>
            <strong>Your camera never leaves your device.</strong> Face detection runs entirely in
            your browser. No video or images are uploaded, streamed, or stored — ever.
          </li>
          <li>
            <strong>Your memory lives on your device</strong> and you can export the whole thing to a
            file at any time, in one click.
          </li>
          <li>
            <strong>There are no ads, no trackers, and no analytics.</strong> Ciocu does not contain
            any advertising or analytics software. We do not sell or share your data with data
            brokers.
          </li>
          <li>
            <strong>What you say to Ciocu is sent to an AI provider</strong> to generate her reply.
            That is the one unavoidable disclosure, and it's described below.
          </li>
        </ul>

        <h2>1. Who is responsible</h2>
        <p>
          {CONTROLLER} is the controller of the personal data described here. For any privacy
          question or request, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>2. What we collect, and why</h2>

        <h3>What you write or say to Ciocu</h3>
        <p>
          Your messages are sent to our server and on to an AI provider so a reply can be generated.
          Short follow-up requests are also made to read the emotional tone of the exchange and to
          decide what is worth remembering. We do not keep your conversations on our servers for our
          own purposes.
        </p>

        <h3>Your account</h3>
        <p>
          If you sign in, Google gives us your email address, name, profile picture and account
          identifier. We verify this with Google and store it in a signed cookie in your browser that
          lasts 30 days, so you stay signed in. We keep no separate user database.
        </p>

        <h3>Your voice</h3>
        <p>
          Voice input is transcribed by a speech-recognition service, and only while Ciocu can see
          that you are present — look away and transcription stops. Which service receives your
          audio depends on your plan, and on your own choice:
        </p>
        <ul>
          <li>
            <strong>Free plan</strong> — your browser&apos;s built-in recognition. In Chrome, that
            means the audio goes to Google.
          </li>
          <li>
            <strong>Paid plans</strong> — Soniox by default, for real-time transcription. You can
            switch to your browser&apos;s own recognition under Settings → Voice, which sends the
            audio to Google instead. The setting decides which of the two hears you.
          </li>
        </ul>
        <p>Audio is used to produce text, and is not retained by us.</p>

        <h3>Your camera</h3>
        <p>
          If you allow it, the camera is used only to tell whether a face is turned toward the
          screen. This runs fully on your device. No image, frame, or video ever leaves it, and we
          never receive any of it — only your browser knows what the camera sees.
        </p>

        <h3>Your memory</h3>
        <p>
          Ciocu's memory of you is stored in your browser on your device, together with the
          on-device search index that makes recall work. If you subscribe and use sync, a copy is
          stored on our server so your devices can share it.{" "}
          <strong>That server copy is not end-to-end encrypted</strong> — it is protected in transit
          and by access control, but we could technically read it. If that matters to you, don't turn
          on sync: everything works on a single device without it.
        </p>

        <h3>Payments</h3>
        <p>
          Lemon Squeezy handles all payments as merchant of record. They collect and hold your
          payment and billing details; we never see or store your card. We ask them, using your email
          address, whether you have an active subscription and what you're entitled to.
        </p>

        <h3>Usage</h3>
        <p>
          Your energy/credit counters are calculated and stored in your own browser. They are not
          reported back to us.
        </p>

        <h3>Server logs</h3>
        <p>
          Our hosting provider processes standard technical data (such as IP address and timestamps)
          to deliver and secure the site.
        </p>

        <h2>3. Who else processes your data</h2>
        <p>These are the only third parties involved, and only for the purpose listed:</p>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What they receive</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Requests, IP, technical logs</td>
              <td>Hosting the site and its API</td>
            </tr>
            <tr>
              <td>OpenRouter / DeepSeek</td>
              <td>Your messages and recalled context</td>
              <td>Generating Ciocu's replies, mood and memory extraction</td>
            </tr>
            <tr>
              <td>Google</td>
              <td>Sign-in identity; audio whenever browser recognition is in use</td>
              <td>Authentication; browser speech recognition</td>
            </tr>
            <tr>
              <td>Soniox</td>
              <td>Audio, when Soniox is your chosen voice provider</td>
              <td>Real-time speech-to-text</td>
            </tr>
            <tr>
              <td>LlamaCloud (LlamaIndex)</td>
              <td>The search query, when a knowledge base is on</td>
              <td>Finding relevant reference material</td>
            </tr>
            <tr>
              <td>Upstash</td>
              <td>Your memory bundle, if sync is on</td>
              <td>Syncing memory across your devices</td>
            </tr>
            <tr>
              <td>Lemon Squeezy</td>
              <td>Your email, payment and billing details</td>
              <td>Selling and processing subscriptions</td>
            </tr>
          </tbody>
        </table>
        <p>
          These providers act under their own privacy policies and terms. Your messages are subject
          to the AI provider's data policy, which may differ from ours — if you would not want a
          third party to process something, don't send it to Ciocu.
        </p>

        <h2>4. What we never do</h2>
        <ul>
          <li>We do not sell your data, or share it with data brokers or advertisers.</li>
          <li>We do not build an advertising profile from your memory. It exists to understand you,
            not to target you.</li>
          <li>We run no analytics, tracking pixels, or third-party cookies.</li>
          <li>We do not upload your camera feed. It never leaves your device.</li>
        </ul>

        <h2>5. Legal bases (GDPR)</h2>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — running the service you asked for: replies,
            memory, sync, subscriptions.
          </li>
          <li>
            <strong>Consent</strong> — camera and microphone access, which your browser asks for and
            you can withdraw at any time; and switching on optional knowledge bases.
          </li>
          <li>
            <strong>Legitimate interests</strong> — keeping the service secure, and preventing abuse
            and fraud.
          </li>
          <li>
            <strong>Legal obligation</strong> — tax and accounting records for purchases, kept by our
            payment provider.
          </li>
        </ul>

        <h2>6. How long things are kept</h2>
        <ul>
          <li>
            <strong>Memory on your device</strong> — until you delete it. Clearing the site's data in
            your browser removes it.
          </li>
          <li>
            <strong>Synced memory</strong> — while sync is active, or until you ask us to delete it.
          </li>
          <li>
            <strong>Session cookie</strong> — 30 days, or until you sign out.
          </li>
          <li>
            <strong>Conversations</strong> — not stored by us beyond what's needed to produce the
            reply.
          </li>
          <li>
            <strong>Invoices</strong> — kept by Lemon Squeezy for as long as tax law requires.
          </li>
        </ul>

        <h2>7. Your rights</h2>
        <p>
          If you are in the EU/EEA or UK you have the right to access, correct, delete, restrict, or
          object to the processing of your personal data, and to data portability. You can also
          complain to your local data protection authority.
        </p>
        <p>
          <strong>Portability is built in:</strong> <em>Menu → Memory → Download memory</em> gives you
          the complete, machine-readable bundle immediately — no request, no waiting. To have a
          synced server copy deleted, or for anything else, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>8. Cookies and local storage</h2>
        <p>
          Ciocu sets no advertising or tracking cookies. We use one signed sign-in cookie
          (<code>ciocu_session</code>), and your browser's own storage on your device to hold your
          memory, your usage counters, your profile, and your settings. Because none of this is used
          for tracking, there is no consent banner to click through.
        </p>

        <h2>9. International transfers</h2>
        <p>
          Our providers are largely based in the United States, so running Ciocu involves
          transferring data outside the EEA. Those transfers rely on the safeguards the providers put
          in place, such as the European Commission's standard contractual clauses.
        </p>

        <h2>10. Children</h2>
        <p>
          Ciocu is not intended for children. You must be old enough to use online services where you
          live. If you believe a child has used Ciocu, contact us and we will help remove the data.
        </p>

        <h2>11. Changes</h2>
        <p>
          If we change how data is handled in a way that affects you, we'll give reasonable notice
          before it takes effect. The date at the top of this page always shows the current version.
        </p>

        <h2>12. Contact</h2>
        <p>
          Privacy questions, deletion requests, or anything else:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <footer className={styles.foot}>
          <span>© {new Date().getFullYear()} Ciocu</span>
          <a href="/terms">Terms of use</a>
        </footer>
      </article>
    </main>
  );
}
