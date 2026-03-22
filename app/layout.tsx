import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MPP Payment Proxy",
  description: "MPP server for PCI-safe agentic payments via Basis Theory proxy",
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
