import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KAIST 졸업요건 분석기 | 나 졸업 가능해?",
  description:
    "KAIST ERP 성적표를 업로드하면 졸업요건 충족 여부를 즉시 확인할 수 있습니다. 모든 데이터는 브라우저에서만 처리됩니다.",
  keywords: ["KAIST", "졸업요건", "졸업", "성적", "학점", "이수요건", "graduation"],
  openGraph: {
    title: "KAIST 졸업요건 분석기",
    description: "나 졸업 가능해? KAIST ERP 성적표로 즉시 확인",
    type: "website",
    locale: "ko_KR",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

const THEME_INIT_SCRIPT = `(() => {
  try {
    const stored = localStorage.getItem('kaist-graduation-theme');
    if (stored === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  } catch (_error) {
    document.documentElement.classList.remove('light');
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
