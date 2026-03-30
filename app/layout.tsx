import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Trust',
  description: 'Universal trust, security, and observability layer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
