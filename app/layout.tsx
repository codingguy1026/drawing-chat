import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drawing Chat",
  description: "목적별 대화방을 만드는 Next.js 챗봇 프로토타입",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
