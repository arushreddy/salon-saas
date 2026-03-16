// src/routes/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import RootLayout from '@/layouts/RootLayout';
import AdminLayout from '@/layouts/AdminLayout';
import StaffLayout from '@/layouts/StaffLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import FranchiseLayout from '@/layouts/FranchiseLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

import Home     from '@/pages/Home';
import Login    from '@/pages/Login';
import Register from '@/pages/Register';

// ── Public booking pages (no auth) ───────────────────────────────────────────
import SalonLanding       from '@/pages/public/SalonLanding';
import PublicBookingFlow  from '@/pages/public/PublicBookingFlow';

// ── Admin pages ──────────────────────────────────────────────────────────────
import AdminDashboard  from '@/pages/admin/AdminDashboard';
import AdminServices   from '@/pages/admin/AdminServices';
import AdminStaff      from '@/pages/admin/AdminStaff';
import AdminCustomers  from '@/pages/admin/AdminCustomers';
import AdminBookings   from '@/pages/admin/AdminBookings';
import AdminAttendance from '@/pages/admin/AdminAttendance';
import AdminInventory  from '@/pages/admin/AdminInventory';
import AdminInvoices   from '@/pages/admin/AdminInvoices';
import AdminCoupons    from '@/pages/admin/AdminCoupons';
import AdminPayments   from '@/pages/admin/AdminPayments';
import AdminSettings   from '@/pages/admin/AdminSettings';
import AdminAnalytics  from '@/pages/admin/AdminAnalytics';
import SetupWizard     from '@/pages/admin/SetupWizard';

// ── Staff / receptionist pages ───────────────────────────────────────────────
import StaffHome             from '@/pages/staff/StaffHome';
import StaffHistory          from '@/pages/staff/StaffHistory';
import StaffSalary           from '@/pages/staff/StaffSalary';
import StaffAttendance       from '@/pages/staff/StaffAttendance';
import StaffNotifications    from '@/pages/staff/StaffNotifications';
import ReceptionistPanel     from '@/pages/staff/ReceptionistPanel';
import ReceptionistDashboard    from '@/pages/receptionist/ReceptionistDashboard';
import ReceptionistAppointments from '@/pages/receptionist/ReceptionistAppointments';
import ReceptionistCustomers    from '@/pages/receptionist/ReceptionistCustomers';
import ReceptionistInventory    from '@/pages/receptionist/ReceptionistInventory';
import ReceptionistStaff        from '@/pages/receptionist/ReceptionistStaff';
import ReceptionistCash         from '@/pages/receptionist/ReceptionistCash';

// ── Customer pages ───────────────────────────────────────────────────────────
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import BookingFlow       from '@/pages/customer/BookingFlow';

// ── Franchise pages ──────────────────────────────────────────────────────────
import FranchiseDashboard  from '@/pages/franchise/FranchiseDashboard';
import BranchList          from '@/pages/franchise/BranchList';
import CrossAnalytics      from '@/pages/franchise/CrossAnalytics';
import FranchiseManagers   from '@/pages/franchise/FranchiseManagers';
import WhatsAppHub         from '@/pages/franchise/WhatsAppHub';

// ── Super Admin pages ────────────────────────────────────────────────────────
import SuperAdminLayout     from '@/layouts/SuperAdminLayout';
import SuperAdminDashboard  from '@/pages/superadmin/SuperAdminDashboard';
import SuperAdminSalons     from '@/pages/superadmin/SuperAdminSalons';
import SuperAdminUsers      from '@/pages/superadmin/SuperAdminUsers';
import SuperAdminPlans      from '@/pages/superadmin/SuperAdminPlans';
import SuperAdminFranchises from '@/pages/superadmin/SuperAdminFranchises';
import SuperAdminAnalytics  from '@/pages/superadmin/SuperAdminAnalytics';
import SuperAdminWhatsApp   from '@/pages/superadmin/SuperAdminWhatsApp';
import SuperAdminExport     from '@/pages/superadmin/SuperAdminExport';
import SuperAdminSecurity   from '@/pages/superadmin/SuperAdminSecurity';
import SuperAdminSettings   from '@/pages/superadmin/SuperAdminSettings';

// ── Role → default redirect ──────────────────────────────────────────────────
const ROLE_HOME = {
  super_admin:       '/superadmin',
  franchise_owner:   '/franchise',
  franchise_manager: '/franchise',
  admin:             '/admin',
  receptionist:      '/staff',
  staff:             '/staff',
  customer:          '/dashboard',
};

const SmartHome = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<SmartHome />} />
        </Route>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/setup"    element={<ProtectedRoute allowedRoles={['admin']}><SetupWizard /></ProtectedRoute>} />

        {/* ── Super Admin ─────────────────────────────────────────────────── */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index             element={<SuperAdminDashboard />} />
          <Route path="salons"     element={<SuperAdminSalons />} />
          <Route path="users"      element={<SuperAdminUsers />} />
          <Route path="plans"      element={<SuperAdminPlans />} />
          <Route path="franchises" element={<SuperAdminFranchises />} />
          <Route path="analytics"  element={<SuperAdminAnalytics />} />
          <Route path="whatsapp"   element={<SuperAdminWhatsApp />} />
          <Route path="export"     element={<SuperAdminExport />} />
          <Route path="security"   element={<SuperAdminSecurity />} />
          <Route path="settings"   element={<SuperAdminSettings />} />
        </Route>

        {/* ── Admin ───────────────────────────────────────────────────────── */}
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}
        >
          <Route index              element={<AdminDashboard />} />
          <Route path="services"    element={<AdminServices />} />
          <Route path="staff"       element={<AdminStaff />} />
          <Route path="customers"   element={<AdminCustomers />} />
          <Route path="appointments" element={<AdminBookings />} />
          <Route path="attendance"  element={<AdminAttendance />} />
          <Route path="inventory"   element={<AdminInventory />} />
          <Route path="invoices"    element={<AdminInvoices />} />
          <Route path="coupons"     element={<AdminCoupons />} />
          <Route path="payments"    element={<AdminPayments />} />
          <Route path="settings"    element={<AdminSettings />} />
          <Route path="analytics"   element={<AdminAnalytics />} />
        </Route>

        {/* ── Staff / Receptionist ────────────────────────────────────────── */}
        <Route
          path="/staff"
          element={<ProtectedRoute allowedRoles={['staff', 'receptionist']}><StaffLayout /></ProtectedRoute>}
        >
          <Route index element={<ReceptionistDashboard />} />
          <Route path="appointments" element={<ReceptionistAppointments />} />
          <Route path="customers"    element={<ReceptionistCustomers />} />
          <Route path="inventory"    element={<ReceptionistInventory />} />
          <Route path="team"         element={<ReceptionistStaff />} />
          <Route path="cash"         element={<ReceptionistCash />} />
          <Route path="reception"    element={<ProtectedRoute allowedRoles={['receptionist']}><ReceptionistPanel /></ProtectedRoute>} />
        </Route>

        {/* ── Customer ────────────────────────────────────────────────────── */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout /></ProtectedRoute>}
        >
          <Route index     element={<CustomerDashboard />} />
          <Route path="book" element={<BookingFlow />} />
        </Route>

        {/* ── Franchise ───────────────────────────────────────────────────── */}
        <Route
          path="/franchise"
          element={<ProtectedRoute allowedRoles={['franchise_owner', 'franchise_manager']}><FranchiseLayout /></ProtectedRoute>}
        >
          <Route index          element={<FranchiseDashboard />} />
          <Route path="branches" element={<BranchList />} />
          <Route path="analytics" element={<CrossAnalytics />} />
          <Route path="managers"  element={<FranchiseManagers />} />
          <Route path="whatsapp"  element={<WhatsAppHub />} />
        </Route>

        {/* ── Public Booking (Phase 5) — no auth required ─────────────────── */}
        <Route path="/book/:slug"             element={<SalonLanding />} />
        <Route path="/book/:slug/appointment" element={<PublicBookingFlow />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};


export default AppRouter;