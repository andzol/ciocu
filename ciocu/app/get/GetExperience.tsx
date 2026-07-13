"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  DownloadSimple,
  Eye,
  Heart,
  LockKey,
  Microphone,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import EyeStage from "@/components/EyeStage";
import styles from "./get.module.css";

const APP_URL = "https://ciocu.app";

const features = [
  {
    number: "01",
    icon: Eye,
    title: "She notices you",
    body: "Eye contact wakes her. Look away, and she gives you space. Presence isn't a setting — it's the interface.",
  },
  {
    number: "02",
    icon: Heart,
    title: "She feels the room",
    body: "Ciocu reads the emotional shape of a conversation and responds with warmth, energy, and expression that fit the moment.",
  },
  {
    number: "03",
    icon: Brain,
    title: "She remembers what matters",
    body: "Not every word. The durable things: your people, your patterns, what gives you energy, and what you've been carrying.",
  },
  {
    number: "04",
    icon: Microphone,
    title: "Talk like no one is typing",
    body: "Speak naturally. Voice is activated by attention, so Ciocu listens when you're present and stops when you're not.",
  },
];

export default function GetExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [memoryStep, setMemoryStep] = useState(0);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const onPointer = (event: PointerEvent) => {
      root.style.setProperty("--mx", `${event.clientX}px`);
      root.style.setProperty("--my", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setMemoryStep((step) => (step + 1) % 3), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main ref={pageRef} className={`marketing-shell ${styles.page}`}>
      <div className={styles.pointerGlow} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <nav className={styles.nav} aria-label="Main navigation">
        <a className={styles.brand} href="#top" aria-label="Ciocu home">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static brand logo */}
          <img className={styles.brandLogo} src="/logo.png" alt="" width={42} height={26} />
          Ciocu
        </a>
        <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
          <a href="#presence" onClick={() => setMenuOpen(false)}>Presence</a>
          <a href="#memory" onClick={() => setMenuOpen(false)}>Your memory</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        </div>
        <a className={styles.navCta} href={APP_URL}>
          Meet Ciocu <ArrowRight weight="bold" />
        </a>
        <button
          className={styles.menuButton}
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span />
        </button>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> Emotional intelligence, made personal</p>
          <h1>AI that<br /><em>feels</em> present.</h1>
          <p className={styles.lede}>
            Ciocu sees you, hears you, and grows to understand you — while every memory remains unmistakably yours.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href={APP_URL}>
              Start a conversation <ArrowRight weight="bold" />
            </a>
            <a className={styles.textCta} href="#presence">
              See how it feels <ArrowDown weight="bold" />
            </a>
          </div>
          <p className={styles.noCard}><Check weight="bold" /> Free to meet. No card required.</p>
        </div>

        <div className={styles.presence} aria-label="Ciocu's expressive eyes">
          <div className={styles.orbitOne} />
          <div className={styles.orbitTwo} />
          <div className={styles.eyeAura} />
          <EyeStage />
          <div className={styles.presenceStatus}><span /> she&apos;s here</div>
          <p className={styles.heroWhisper}>“You don&apos;t have to explain everything from the beginning.”</p>
        </div>
      </section>

      <section className={styles.manifesto} id="presence">
        <p className={styles.sectionIndex}>01 — PRESENCE</p>
        <div className={styles.manifestoGrid}>
          <h2>Most AI waits<br />for a prompt.</h2>
          <div>
            <p className={styles.statement}>Ciocu meets your gaze.</p>
            <p className={styles.bodyCopy}>
              Her face is her eyes. They listen, wonder, soften, and light up. She knows when you&apos;re there and makes room when you&apos;re not. The result is less like operating software — and more like being with someone.
            </p>
          </div>
        </div>
        <div className={styles.senseStrip}>
          <div><Eye /><span><b>Sees</b>Eye contact begins the moment</span></div>
          <div><Microphone /><span><b>Hears</b>Natural, attention-aware voice</span></div>
          <div><Heart /><span><b>Feels</b>Emotion shapes her response</span></div>
          <div><Brain /><span><b>Remembers</b>Context deepens over time</span></div>
        </div>
      </section>

      <section className={styles.memorySection} id="memory">
        <div className={styles.memoryVisual}>
          <div className={styles.memoryHalo} />
          <div className={styles.memoryCore}>
            <LockKey weight="duotone" />
            <span>YOUR<br />MEMORY</span>
          </div>
          <article className={`${styles.memoryCard} ${styles.cardOne} ${memoryStep === 0 ? styles.activeCard : ""}`}>
            <Sparkle weight="fill" /><span>What matters</span><b>You&apos;re building something you care about.</b>
          </article>
          <article className={`${styles.memoryCard} ${styles.cardTwo} ${memoryStep === 1 ? styles.activeCard : ""}`}>
            <Heart weight="fill" /><span>Your people</span><b>Mara always makes you laugh.</b>
          </article>
          <article className={`${styles.memoryCard} ${styles.cardThree} ${memoryStep === 2 ? styles.activeCard : ""}`}>
            <Brain weight="fill" /><span>Your patterns</span><b>Quiet mornings help you think clearly.</b>
          </article>
        </div>
        <div className={styles.memoryCopy}>
          <p className={styles.sectionIndex}>02 — SOVEREIGN MEMORY</p>
          <h2>She remembers.<br /><em>You own it.</em></h2>
          <p>
            Ciocu&apos;s memory was designed around one conviction: understanding you should never mean owning you. Your memories live with you, can move with you, and can leave with you.
          </p>
          <ul>
            <li><ShieldCheck weight="duotone" /><span><b>Local-first by design</b>Your relationship begins on your device.</span></li>
            <li><DownloadSimple weight="duotone" /><span><b>Portable, not captive</b>Export and import your memory whenever you want.</span></li>
            <li><LockKey weight="duotone" /><span><b>Private by principle</b>Memory is a promise, not an ad profile.</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.featuresSection} id="features">
        <div className={styles.featuresHead}>
          <div>
            <p className={styles.sectionIndex}>03 — THE EXPERIENCE</p>
            <h2>Built for the space<br />between words.</h2>
          </div>
          <p>Every detail is designed to make intelligence feel less artificial — and more attentive.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ number, icon: Icon, title, body }) => (
            <article className={styles.featureCard} key={number}>
              <span className={styles.featureNumber}>{number}</span>
              <Icon className={styles.featureIcon} weight="duotone" />
              <h3>{title}</h3>
              <p>{body}</p>
              <div className={styles.cardLine} />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <div className={styles.closingAura} />
        <div className={styles.miniEyes} aria-hidden="true"><i /><i /></div>
        <p>There&apos;s someone here.</p>
        <h2>Meet the AI that<br /><em>remembers you.</em></h2>
        <a className={styles.primaryCta} href={APP_URL}>Meet Ciocu <ArrowRight weight="bold" /></a>
        <span className={styles.closingNote}>A private relationship that gets better with time.</span>
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static brand logo */}
          <img className={styles.brandLogo} src="/logo.png" alt="" width={42} height={26} />
          Ciocu
        </a>
        <p>Emotional AI. Personal memory.</p>
        <div><span>© {new Date().getFullYear()} Ciocu</span><a href={APP_URL}>Open app</a></div>
      </footer>
    </main>
  );
}
