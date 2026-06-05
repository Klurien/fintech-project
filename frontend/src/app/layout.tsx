import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RetailTrack — Multimodal Transport & Trading Platform',
  description: 'Real-time multimodal tracking (ships, trucks, aircraft) with double-entry financial ledger, market data, and OCR receipt processing.',
  keywords: ['fleet tracking', 'AIS', 'maritime', 'crypto', 'ledger', 'fintech'],
  openGraph: {
    title: 'RetailTrack — Multimodal Transport & Trading Platform',
    description: 'Real-time multimodal tracking with financial ledger',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans h-full`}>
        {children}
      </body>
    </html>
  )
}
