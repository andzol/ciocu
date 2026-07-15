"use client";

import { useEffect, useState } from "react";
import styles from "./get.module.css";

interface Stats {
  users: number;
  messages: number;
  hours: number;
}

// Don't show real numbers until they're meaningful — a "7 people" badge hurts more than it helps.
// Below this, the strip renders nothing (no fabricated figures).
const MIN_USERS = 50;

export default function SocialProof() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Stats | null) => {
        if (!cancelled && s) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats || stats.users < MIN_USERS) return null;

  return (
    <div className={styles.socialProof} aria-label="Ciocu by the numbers">
      <span className={styles.spItem}>
        <b>{stats.users.toLocaleString()}</b> people talking to Ciocu
      </span>
      <span className={styles.spDot} aria-hidden="true" />
      <span className={styles.spItem}>
        <b>{stats.messages.toLocaleString()}</b> messages heard
        {stats.hours > 0 ? ` · ~${stats.hours.toLocaleString()} hrs together` : ""}
      </span>
    </div>
  );
}
