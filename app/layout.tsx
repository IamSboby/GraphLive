import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { defaultThemeCss } from "../packages/appearance/config";
export const metadata: Metadata = {
  title: "GraphLive",
  description: "Tu red privada de personas y conexiones.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style nonce={nonce}>{defaultThemeCss}</style>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('graphlive-theme');document.documentElement.dataset.theme=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light'}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
