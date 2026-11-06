import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoolRoute: heat-aware routing",
  description: "Walking routes that trade a little time for a lot less heat exposure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
