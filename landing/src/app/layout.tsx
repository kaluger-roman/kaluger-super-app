import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import tutorData from "@/data/tutor.json";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const canonicalUrl = "https://teacher.kaluger.ru";

export const metadata: Metadata = {
  title: tutorData.seo.title,
  description: tutorData.seo.description,
  metadataBase: new URL(canonicalUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: tutorData.seo.title,
    description: tutorData.seo.description,
    url: canonicalUrl,
    siteName: `${tutorData.lastName} ${tutorData.firstName} ${tutorData.patronymic} — Репетитор`,
    images: [
      {
        url: tutorData.seo.ogImage,
        width: 1200,
        height: 630,
        alt: tutorData.seo.title,
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
