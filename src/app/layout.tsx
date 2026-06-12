import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeddingTech — Live Photo Wall",
  description: "Turn your guests into the highlight of the night. A live photo wall that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Mitr:wght@300;400;500;600&family=Charm:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
