import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TankWorks · 储罐设计器",
  description: "参数化立式储罐工程设计、展开与预制放样工具",
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
