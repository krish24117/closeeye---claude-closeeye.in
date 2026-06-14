import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/pages/Home'
import { ServicesPage } from '@/pages/Services'
import { AboutPage } from '@/pages/About'
import { FAQPage } from '@/pages/FAQ'
import { ContactPage } from '@/pages/Contact'
import { WaitlistPage } from '@/pages/Waitlist'
import { AuthPage } from '@/pages/Auth'
import { DashboardLayout } from '@/pages/dashboard/Layout'
import { DashboardHome } from '@/pages/dashboard/Home'
import { DashboardBookings } from '@/pages/dashboard/Bookings'
import { DashboardLovedOnes } from '@/pages/dashboard/LovedOnes'
import { DashboardReports } from '@/pages/dashboard/Reports'
import { DashboardNotifications } from '@/pages/dashboard/Notifications'
import { CompanionLayout } from '@/pages/companion/Layout'
import { CompanionHome } from '@/pages/companion/Home'
import { CompanionVisit } from '@/pages/companion/Visit'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to="/auth" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
  )
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
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
          <Route path="/waitlist" element={<PublicLayout><WaitlistPage /></PublicLayout>} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Family dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute role="family"><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="bookings" element={<DashboardBookings />} />
            <Route path="loved-ones" element={<DashboardLovedOnes />} />
            <Route path="reports" element={<DashboardReports />} />
            <Route path="notifications" element={<DashboardNotifications />} />
          </Route>

          {/* Companion portal */}
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
