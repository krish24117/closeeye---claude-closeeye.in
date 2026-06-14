import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/pages/Home'
import { ServicesPage } from '@/pages/Services'
import { AboutPage } from '@/pages/About'
import { FAQPage } from '@/pages/FAQ'
import { ContactPage } from '@/pages/Contact'
import { WaitlistPage } from '@/pages/Waitlist'
import { AuthPage } from '@/pages/Auth'
import { PrivacyPage } from '@/pages/Privacy'
import { TermsPage } from '@/pages/Terms'
import { DashboardLayout } from '@/pages/dashboard/Layout'
import { DashboardHome } from '@/pages/dashboard/Home'
import { DashboardBookings } from '@/pages/dashboard/Bookings'
import { DashboardLovedOnes } from '@/pages/dashboard/LovedOnes'
import { DashboardReports } from '@/pages/dashboard/Reports'
import { DashboardNotifications } from '@/pages/dashboard/Notifications'
import { CompanionLayout } from '@/pages/companion/Layout'
import { CompanionHome } from '@/pages/companion/Home'
import { CompanionVisit } from '@/pages/companion/Visit'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Close Eye — When you can\'t be there, Close Eye can.',
  '/services': 'Services — Close Eye',
  '/about': 'About Us — Close Eye',
  '/faq': 'FAQ — Close Eye',
  '/contact': 'Contact — Close Eye',
  '/waitlist': 'Join Waitlist — Close Eye',
  '/auth': 'Sign In — Close Eye',
  '/privacy-policy': 'Privacy Policy — Close Eye',
  '/terms': 'Terms of Service — Close Eye',
  '/dashboard': 'Dashboard — Close Eye',
  '/dashboard/bookings': 'My Bookings — Close Eye',
  '/dashboard/loved-ones': 'Loved Ones — Close Eye',
  '/dashboard/reports': 'Visit Reports — Close Eye',
  '/dashboard/notifications': 'Notifications — Close Eye',
  '/companion': 'Companion Portal — Close Eye',
}

function PageTitleManager() {
  const location = useLocation()
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'Close Eye — Your trusted presence in India'
    document.title = title
  }, [location.pathname])
  return null
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-green-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <PageTitleManager />
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
          <Route path="/waitlist" element={<PublicLayout><WaitlistPage /></PublicLayout>} />
          <Route path="/privacy-policy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
          <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
          <Route path="/auth" element={<AuthPage />} />

          <Route path="/dashboard" element={<ProtectedRoute role="family"><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="bookings" element={<DashboardBookings />} />
            <Route path="loved-ones" element={<DashboardLovedOnes />} />
            <Route path="reports" element={<DashboardReports />} />
            <Route path="notifications" element={<DashboardNotifications />} />
          </Route>

          <Route path="/companion" element={<ProtectedRoute role="companion"><CompanionLayout /></ProtectedRoute>}>
            <Route index element={<CompanionHome />} />
            <Route path="visit/:bookingId" element={<CompanionVisit />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
