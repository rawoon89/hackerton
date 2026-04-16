import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한화생명 Insight BI",
  description: "자연어로 물어보는 보험 데이터 BI 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
