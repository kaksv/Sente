import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sente — Know which payments are real",
  description:
    "Mobile-money ledger and fake-payment detector for Ugandan small shops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
