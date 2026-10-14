import type { Metadata } from "next";
import { ApplicationPage } from "@/packages/ui/application-page";
export const metadata: Metadata = {
  title: "GraphLive — Your personal network · Made by Sboby",
  description:
    "Map your contacts, friendships and interests in a private visual network. Save on your device or Google Drive. Made by Sboby.",
  alternates: { canonical: "https://iamsboby.github.io/GraphLive/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "GraphLive",
    title: "GraphLive — Your personal network · Made by Sboby",
    description:
      "A private visual map of the people who shape your world. Made by Sboby.",
    url: "https://iamsboby.github.io/GraphLive/",
  },
};
export const dynamic = "force-dynamic";
export default function Page() {
  return <ApplicationPage screen="home" />;
}
