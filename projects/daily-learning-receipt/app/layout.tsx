import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "今日学习收据",
  description: "把零散的学习、困惑和想法变成明天的方向。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
