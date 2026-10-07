import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "情归纸笔",
    template: "%s | 情归纸笔",
  },
  description: "写一封信，认识一个人。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
