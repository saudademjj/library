import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "图书馆座位预约系统",
  description: "智能预约，高效学习 - 在线图书馆座位预约管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '16px',
              fontSize: '14px',
            },
            classNames: {
              success: 'border-green-200 bg-green-50',
              error: 'border-red-200 bg-red-50',
              warning: 'border-amber-200 bg-amber-50',
              info: 'border-blue-200 bg-blue-50',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
