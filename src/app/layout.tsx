import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clariva — Run your school with clarity",
  description:
    "Nigeria's school management platform. Manage students, results, fees, CBT exams, attendance, and timetables in one place. Built for Nigerian schools. Works offline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 5000, style: { fontSize: '14px', maxWidth: '420px' } }} />
      </body>
    </html>
  );
}
