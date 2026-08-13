import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ScanAvis — Plus d'avis Google, sans effort",
    template: "%s · ScanAvis",
  },
  description:
    "ScanAvis transforme vos clients satisfaits en avis Google grâce à un simple QR code, et filtre les retours négatifs en privé.",
  applicationName: "ScanAvis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={spaceGrotesk.variable}>
      <body
        className="min-h-full flex flex-col font-sans antialiased"
        style={{ fontFamily: "Space Grotesk, system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
