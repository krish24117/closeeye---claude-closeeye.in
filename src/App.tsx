import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { ToastProvider } from '@/components/ui/Toast'
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
import { DashboardNewBooking } from '@/pages/dashboard/NewBooking'
import { CompanionLayout } from '@/pages/companion/Layout'
import { CompanionHome } from '@/pages/companion/Home'
import { CompanionVisit } from '@/pages/companion/Visit'
import { CompanionSchedule } from '@/pages/companion/Schedule'
import { CompanionEarnings } from '@/pages/companion/Earnings'
import { CompanionProfile } from '@/pages/companion/Profile'
import { AdminLayout } from '@/pages/admin/Layout'
import { AdminHome } from '@/pages/admin/Home'
import { AdminBookings } from '@/pages/admin/Bookings'
import { AdminCompanions } from '@/pages/admin/Companions'
import { AdminFamilies } from '@/pages/admin/Families'
import { AdminPayments } from '@/pages/admin/Payments'
import { AdminReports } from '@/pages/admin/Reports'
import { AdminLiveMap } from '@/pages/admin/LiveMap'

const PAGE_TITLES: Record<string, string> = {
  '/': "Close Eye — When you can't be there, Close Eye can.",
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
  '/dashboard/new-booking': 'Book a Visit — Close Eye',
  '/companion': 'Companion Portal — Close Eye',
  '/companion/schedule': 'My Schedule — Close Eye',
  '/companion/earnings': 'Earnings — Close Eye',
  '/companion/profile': 'My Profile — Close Eye',
  '/admin': 'Admin Portal — Close Eye',
  '/admin/bookings': 'Manage Bookings — Close Eye',
  '/admin/companions': 'Manage Companions — Close Eye',
  '/admin/families': 'Families — Close Eye',
  '/admin/payments': 'Payments — Close Eye',
  '/admin/reports': 'Visit Reports — Close Eye',
  '/admin/live-map': 'Live Map — Close Eye',
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Verified wellbeing visits and trusted local support for your loved ones in India. Real visits. Real photos. Real reports.',
  '/services': 'Companion visits, hospital companions, emergency visits, and monthly care plans — choose the right support for your loved one in India.',
  '/about': 'Meet Close Eye — verified local companions providing trusted, in-person wellbeing visits for elderly parents and loved ones across India.',
  '/faq': 'Answers to common questions about Close Eye visits, companion verification, pricing, cancellations, and coverage areas.',
  '/contact': 'Get in touch with the Close Eye team on WhatsApp or email — we reply within a few hours.',
  '/waitlist': 'Join the Close Eye waitlist to be notified the moment we launch verified companion visits in your city.',
  '/auth': 'Sign in or create a Close Eye account to book and manage companion visits for your loved ones.',
  '/privacy-policy': "How Close Eye collects, uses, and protects your family's data.",
  '/terms': 'Terms of service for booking and using Close Eye companion visits.',
  '/dashboard': 'Manage your bookings, loved ones, visit reports, and notifications.',
  '/dashboard/bookings': 'View and manage your Close Eye companion visit bookings.',
  '/dashboard/loved-ones': 'Manage the profiles of the family members Close Eye visits.',
  '/dashboard/reports': 'Read visit reports and photos from your loved one’s companion visits.',
  '/dashboard/notifications': 'Your Close Eye notifications and alerts.',
  '/dashboard/new-booking': 'Book a companion visit, hospital companion, or care plan for your loved one in India.',
  '/companion': 'Manage your assigned visits and submit visit reports.',
  '/companion/schedule': 'View your upcoming and past Close Eye visit schedule.',
  '/companion/earnings': 'Track your Close Eye visit earnings.',
  '/companion/profile': 'Manage your companion profile, documents, and visit alert settings.',
  '/admin': 'Admin overview of bookings, companions, and families.',
  '/admin/bookings': 'Manage all Close Eye bookings and assign companions.',
  '/admin/companions': 'Manage companion accounts.',
  '/admin/families': 'View all registered families and their loved ones.',
  '/admin/payments': 'Revenue, payouts, and platform margin overview.',
  '/admin/reports': 'All visit reports and media submitted by companions.',
  '/admin/live-map': 'Live map of companions on active visits.',
}

const SITE_URL = 'https://www.closeeye.in'

function SEOManager() {
  const location = useLocation()
  useEffect(() => {
    const { pathname } = location

    document.title = PAGE_TITLES[pathname] || 'Close Eye — Your trusted presence in India'

    const description = PAGE_DESCRIPTIONS[pathname] || PAGE_DESCRIPTIONS['/']
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)

    const canonicalUrl = pathname === '/' ? `${SITE_URL}/` : `${SITE_URL}${pathname}`
    let canonicalTag = document.querySelector('link[rel="canonical"]')
    if (!canonicalTag) {
      canonicalTag = document.createElement('link')
      canonicalTag.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalTag)
    }
    canonicalTag.setAttribute('href', canonicalUrl)

    const isPrivate = pathname.startsWith('/dashboard') || pathname.startsWith('/companion') || pathname.startsWith('/admin')
    let robotsTag = document.querySelector('meta[name="robots"]')
    if (isPrivate) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta')
        robotsTag.setAttribute('name', 'robots')
        document.head.appendChild(robotsTag)
      }
      robotsTag.setAttribute('content', 'noindex, nofollow')
    } else {
      robotsTag?.remove()
    }
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
      <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <SEOManager />
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
            <Route path="new-booking" element={<DashboardNewBooking />} />
          </Route>
          <Route path="/companion" element={<ProtectedRoute role="companion"><CompanionLayout /></ProtectedRoute>}>
            <Route index element={<CompanionHome />} />
            <Route path="visit/:bookingId" element={<CompanionVisit />} />
            <Route path="schedule" element={<CompanionSchedule />} />
            <Route path="earnings" element={<CompanionEarnings />} />
            <Route path="profile" element={<CompanionProfile />} />
            <Route path="dashboard" element={<Navigate to="/companion" replace />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminHome />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="companions" element={<AdminCompanions />} />
            <Route path="families" element={<AdminFamilies />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="live-map" element={<AdminLiveMap />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
