import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The share card for ciocu.app (Open Graph + X/Twitter). Generated at build, 1200×630 — the size X
// renders as a large card. Before this the app root shipped no card image at all, so a shared link
// was a bare blue string.
//
// Composition mirrors the get.ciocu.app hero: headline left, her eyes right. Drawn in Satori's CSS
// subset (what next/og supports): flexbox, gradients, borderRadius, boxShadow. It is a faithful
// STILL, not the live engine — the real eyes lean on per-frame Gaussian-blur bloom that Satori
// can't render, so the glow here is approximated with boxShadow. For the exact bloom-lit render,
// drop a 1200×630 PNG in as app/opengraph-image.png and delete this file — the file overrides.

export const alt = "Ciocu — an AI that feels present";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// App tokens (globals.css), copied so the card matches the product exactly.
const BG = "#05070b";
const CYAN = "#37e6ff";
const CAPTION = "#d6fbff";
const TEXT = "#cfe9f2";
const DIM = "#7f97a6";

function Eye() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: 150,
        height: 188,
        borderRadius: 46,
        background: "linear-gradient(180deg, #7ef1ff 0%, #2fddf4 52%, #17a6c2 100%)",
        boxShadow: "0 0 80px 14px rgba(55, 230, 255, 0.5)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 27,
          bottom: 20,
          width: 96,
          height: 96,
          borderRadius: 96,
          background: "radial-gradient(circle at 50% 55%, #0c1826 0%, #060b12 78%)",
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 14,
            width: 34,
            height: 40,
            borderRadius: 34,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            width: 11,
            height: 11,
            borderRadius: 11,
            background: "rgba(255,255,255,0.85)",
          }}
        />
      </div>
    </div>
  );
}

export default async function Image() {
  const [bold, regular] = await Promise.all([
    readFile(join(process.cwd(), "assets/Bricolage-Bold.ttf")),
    readFile(join(process.cwd(), "assets/Bricolage-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: `radial-gradient(circle at 72% 46%, #0a0e14 0%, ${BG} 68%)`,
          fontFamily: "Bricolage",
          padding: "0 76px",
        }}
      >
        {/* Left: the headline, echoing the marketing hero. */}
        <div style={{ display: "flex", flexDirection: "column", width: 660 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: DIM }}>
            EMOTIONAL INTELLIGENCE, MADE PERSONAL
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: 22,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: CAPTION,
            }}
          >
            <span>AI that&nbsp;</span>
            <span style={{ color: CYAN }}>feels</span>
            <span>&nbsp;present.</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 27,
              fontWeight: 400,
              lineHeight: 1.35,
              color: TEXT,
              maxWidth: 600,
            }}
          >
            She sees you, hears you, and remembers — while every memory stays unmistakably yours.
          </div>
        </div>

        {/* Right: her eyes, inside the faint ring from the hero. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              width: 400,
              height: 400,
              borderRadius: 400,
              border: "1px solid rgba(55, 230, 255, 0.14)",
            }}
          >
            <Eye />
            <Eye />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bold, style: "normal", weight: 700 },
        { name: "Bricolage", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
