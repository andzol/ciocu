import type { Metadata } from "next";
import GetExperience from "./GetExperience";

export const metadata: Metadata = {
  title: "Ciocu — AI that feels present",
  description:
    "An emotionally present AI that sees you, hears you, and remembers what matters. Your memory stays yours.",
  alternates: { canonical: "https://get.ciocu.app" },
  openGraph: {
    title: "Ciocu — AI that feels present",
    description: "Not another assistant. A presence that grows with you — with memory you own.",
    url: "https://get.ciocu.app",
    siteName: "Ciocu",
    type: "website",
  },
};

export default function GetPage() {
  return <GetExperience />;
}
