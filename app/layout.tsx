import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { StartupAnimation } from "../packages/ui/startup-animation";
import { defaultThemeCss } from "../packages/appearance/config";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "GraphLive",
  description: "Your private network of people and connections.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body>
        <StartupAnimation />
        {children}
      </body>
    </html>
  );
}
