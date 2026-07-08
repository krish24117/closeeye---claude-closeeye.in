import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

/** Public marketing surface — the sticky Navbar + Footer chrome. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
