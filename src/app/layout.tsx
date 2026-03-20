import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AlertNotifier from "@/components/AlertNotifier";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyNews - 나만의 AI 신문",
  description: "같은 뉴스, 나만의 시선. 매경 뉴스를 AI가 당신에게 맞춰 재해석합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} dark`}>
      <body className="min-h-full flex flex-col antialiased bg-zinc-950">
        <div className="pb-16">{children}</div>
        <BottomNav />
        <AlertNotifier />
      </body>
    </html>
  );
}
