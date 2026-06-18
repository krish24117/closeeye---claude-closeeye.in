import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { ToastProvider } from '@/components/ui/Toast'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { IOSInstallBanner } from '@/components/IOSInstallBanner'

// Public pages — eagerly bundled (landing page must render without waiting for chunks)
import { HomePage } from '@/pages/Home'
import { ServicesPage } from '@/pages/Services'
import { AboutPage } from '@/pages/About'
import { FAQPage } from '@/pages/FAQ'
import { ContactPage } from '@/pages/Contact'
import { WaitlistPage } from '@/pages/Waitlist'
import { PrivacyPage } from '@/pages/Privacy'
import { TermsPage } from '@/pages/Terms'
import { RefundPage } from '@/pages/Refund'

// Auth + app sections — lazy-loaded to keep initial bundle lean
const AuthPage = lazy(() => import('@/pages/Auth').then(m => ({ default: m.AuthPage })))

const DashboardLayout = lazy(() => import('@/pages/dashboard/Layout').then(m => ({ default: m.DashboardLayout })))
const DashboardHome = lazy(() => import('@/pages/dashboard/Home').then(m => ({ default: m.DashboardHome })))
const DashboardBookings = lazy(() => import('@/pages/dashboard/Bookings').then(m => ({ default: m.DashboardBookings })))
const DashboardLovedOnes = lazy(() => import('@/pages/dashboard/LovedOnes').then(m => ({ default: m.DashboardLovedOnes })))
const DashboardReports = lazy(() => import('@/pages/dashboard/Reports').then(m => ({ default: m.DashboardReports })))
const DashboardNotifications = lazy(() => import('@/pages/dashboard/Notifications').then(m => ({ default: m.DashboardNotifications })))
const DashboardNewBooking = lazy(() => import('@/pages/dashboard/NewBooking').then(m => ({ default: m.DashboardNewBooking })))
const DashboardMembers = lazy(() => import('@/pages/dashboard/Members').then(m => ({ default: m.DashboardMembers })))
const DashboardSubscription = lazy(() => import('@/pages/dashboard/Subscription').then(m => ({ default: m.DashboardSubscription })))
const BookingConfirmationPage = lazy(() => import('@/pages/dashboard/BookingConfirmation').then(m => ({ default: m.BookingConfirmationPage })))

const CompanionLayout = lazy(() => import('@/pages/companion/Layout').then(m => ({ default: m.CompanionLayout })))
const CompanionHome = lazy(() => import('@/pages/companion/Home').then(m => ({ default: m.CompanionHome })))
const CompanionVisit = lazy(() => import('@/pages/companion/Visit').then(m => ({ default: m.CompanionVisit })))
const CompanionSchedule = lazy(() => import('@/pages/companion/Schedule').then(m => ({ default: m.CompanionSchedule })))
const CompanionEarnings = lazy(() => import('@/pages/companion/Earnings').then(m => ({ default: m.CompanionEarnings })))
const CompanionProfile = lazy(() => import('@/pages/companion/Profile').then(m => ({ default: m.CompanionProfile })))

const AdminLayout = lazy(() => import('@/pages/admin/Layout').then(m => ({ default: m.AdminLayout })))
const AdminHome = lazy(() => import('@/pages/admin/Home').then(m => ({ default: m.AdminHome })))
const AdminBookings = lazy(() => import('@/pages/admin/Bookings').then(m => ({ default: m.AdminBookings })))
const AdminCompanions = lazy(() => import('@/pages/admin/Companions').then(m => ({ default: m.AdminCompanions })))
const AdminFamilies = lazy(() => import('@/pages/admin/Families').then(m => ({ default: m.AdminFamilies })))
const AdminPayments = lazy(() => import('@/pages/admin/Payments').then(m => ({ default: m.AdminPayments })))
const AdminReports = lazy(() => import('@/pages/admin/Reports').then(m => ({ default: m.AdminReports })))
const AdminLiveMap = lazy(() => import('@/pages/admin/LiveMap').then(m => ({ default: m.AdminLiveMap })))
const AdminSurveyLeads = lazy(() => import('@/pages/admin/SurveyLeads').then(m => ({ default: m.AdminSurveyLeads })))
const AdminLeadsCRM = lazy(() => import('@/pages/admin/LeadsCRM').then(m => ({ default: m.AdminLeadsCRM })))

const SurveyPage = lazy(() => import('@/pages/Survey').then(m => ({ default: m.SurveyPage })))

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
  '/refund-policy': 'Refund & Cancellation Policy — Close Eye',
  '/dashboard': 'Dashboard — Close Eye',
  '/dashboard/bookings': 'My Bookings — Close Eye',
  '/dashboard/loved-ones': 'Loved Ones — Close Eye',
  '/dashboard/reports': 'Visit Reports — Close Eye',
  '/dashboard/notifications': 'Notifications — Close Eye',
  '/dashboard/new-booking': 'Book a Visit — Close Eye',
  '/dashboard/members': 'Family Members — Close Eye',
  '/dashboard/subscription': 'Subscription — Close Eye',
  '/dashboard/booking-confirmation': 'Booking Confirmed — Close Eye',
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
  '/admin/survey-leads': 'Survey Leads — Close Eye',
  '/survey': 'Survey — Close Eye',
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
  '/refund-policy': 'Cancellation and refund policy for Close Eye companion visits and monthly plans.',
  '/dashboard': 'Manage your bookings, loved ones, visit reports, and notifications.',
  '/dashboard/bookings': 'View and manage your Close Eye companion visit bookings.',
  '/dashboard/loved-ones': 'Manage the profiles of the family members Close Eye visits.',
  '/dashboard/reports': "Read visit reports and photos from your loved one's companion visits.",
  '/dashboard/notifications': 'Your Close Eye notifications and alerts.',
  '/dashboard/new-booking': 'Book a companion visit, hospital companion, or care plan for your loved one in India.',
  '/dashboard/members': 'Add family members who receive visit notifications and SOS alerts.',
  '/dashboard/subscription': 'Manage your Close Eye subscription plan and billing.',
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

    const isPrivate = pathname.startsWith('/dashboard') || pathname.startsWith('/companion') || pathname.startsWith('/admin') || pathname === '/survey'
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

    // GA4 page_view — fires on every route change (including back/forward)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gtagFn = (window as any).gtag
    if (typeof gtagFn === 'function') {
      const params: Record<string, string> = {
        page_path: pathname + location.search,
        page_title: PAGE_TITLES[pathname] || 'Close Eye',
      }
      // Capture ?source= on /survey so it appears as a custom dimension in GA4
      if (pathname === '/survey') {
        const source = new URLSearchParams(location.search).get('source')
        if (source) params.survey_source = source
      }
      gtagFn('event', 'page_view', params)
    }
  }, [location.pathname, location.search])
  return null
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading } = useAuth()
  if (loading || (user && !profile)) return (
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
      <IOSInstallBanner />
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

function RouteSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="w-10 h-10 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <SEOManager />
        <Suspense fallback={<RouteSpinner />}>
          <Routes>
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/waitlist" element={<PublicLayout><WaitlistPage /></PublicLayout>} />
            <Route path="/privacy-policy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
            <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
            <Route path="/refund-policy" element={<PublicLayout><RefundPage /></PublicLayout>} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/survey" element={<SurveyPage />} />
            <Route path="/dashboard" element={<ProtectedRoute role="family"><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="bookings" element={<DashboardBookings />} />
              <Route path="loved-ones" element={<DashboardLovedOnes />} />
              <Route path="reports" element={<DashboardReports />} />
              <Route path="notifications" element={<DashboardNotifications />} />
              <Route path="new-booking" element={<DashboardNewBooking />} />
              <Route path="members" element={<DashboardMembers />} />
              <Route path="subscription" element={<DashboardSubscription />} />
              <Route path="booking-confirmation" element={<BookingConfirmationPage />} />
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
              <Route path="survey-leads" element={<AdminSurveyLeads />} />
              <Route path="leads" element={<AdminLeadsCRM />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
