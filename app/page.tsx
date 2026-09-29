import type { Metadata } from "next";
import { ApplicationPage } from "@/packages/ui/application-page";
export const metadata: Metadata = {
  title: "GraphLive — Tu red personal de personas y conexiones",
  description:
    "Organiza tus contactos, amistades e intereses en un mapa visual privado. Guarda tu red en tu dispositivo o en Google Drive y explora tus conexiones con GraphLive.",
  alternates: { canonical: "https://iamsboby.github.io/GraphLive/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "GraphLive",
    title: "GraphLive — Tu red personal de personas y conexiones",
    description:
      "Un mapa visual privado de las personas que forman parte de tu mundo.",
    url: "https://iamsboby.github.io/GraphLive/",
  },
};
export const dynamic = "force-dynamic";
export default function Page() {
  return <ApplicationPage screen="home" />;
}
