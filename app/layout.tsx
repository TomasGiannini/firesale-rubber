import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SEO_CONFIG } from '@/lib/seo'
import { WebsiteJsonLd } from '@/components/seo/WebsiteJsonLd'
import { OrganizationJsonLd } from '@/components/seo/OrganizationJsonLd'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  title: {
    default: SEO_CONFIG.defaultTitle,
    template: SEO_CONFIG.titleTemplate,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.keywords.home,
  authors: [{ name: 'Firesale Rubber' }],
  creator: 'Firesale Rubber',
  publisher: 'Firesale Rubber',
  openGraph: {
    type: 'website',
    locale: SEO_CONFIG.locale,
    url: SEO_CONFIG.siteUrl,
    siteName: SEO_CONFIG.siteName,
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: [
      {
        url: SEO_CONFIG.defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'Firesale Rubber — Overstock Rubber Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: [SEO_CONFIG.defaultOgImage],
    creator: SEO_CONFIG.twitterHandle,
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google8f75b854d05527bc',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://wtlzsfhhjmyegmdmwigh.supabase.co" />
      </head>
      <body className="min-h-full">
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  )
}
