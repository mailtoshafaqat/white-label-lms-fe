import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "White-Label LMS",
  description: "Exam-prep LMS prototype",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
