import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "前哨 · 投资情报雷达",
  description: "你的 A 股、港股、美股投资情报台。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "前哨 · 投资情报雷达",
    description: "把与你有关的公司、产业链、指数和海外映射信号排好队。",
    images: ["/social-preview.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
