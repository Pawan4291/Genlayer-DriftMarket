import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriftMarket — AI-Priced NFT Marketplace on GenLayer",
  description:
    "Real NFT marketplace where prices drift via GenLayer Optimistic Democracy AI consensus. Every price change is a real on-chain validator vote.",
  openGraph: {
    title: "DriftMarket",
    description: "AI-Priced NFTs on GenLayer Testnet",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-black antialiased font-[Inter]">{children}</body>
    </html>
  );
}
