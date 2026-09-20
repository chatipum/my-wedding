import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai } from 'next/font/google'
import { Nav } from '@/components/nav'
import './globals.css'

const sansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans-thai',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'งานแต่งบาสเพลง',
  description: 'ข้อมูลการจัดงานแต่ง',
  // เว็บไม่มี login โดยตั้งใจ — อย่างน้อยกัน search engine ไม่ให้เก็บ index
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sansThai.variable}>
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">{children}</main>
      </body>
    </html>
  )
}
