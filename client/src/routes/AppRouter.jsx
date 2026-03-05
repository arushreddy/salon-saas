import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminLayout from '@/layouts/AdminLayout';
import StaffLayout from '@/layouts/StaffLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';


import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminServices from '@/pages/admin/AdminServices';
import AdminBookings from '@/pages/admin/AdminBookings';
import AdminStaff from '@/pages/admin/AdminStaff';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import SetupWizard from '@/pages/admin/SetupWizard';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminInvoices from '@/pages/admin/AdminInvoices';
import AdminCoupons from '@/pages/admin/AdminCoupons';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminSettings from '@/pages/admin/AdminSettings';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffAppointments from '@/pages/staff/StaffAppointments';
import StaffProfile from '@/pages/staff/StaffProfile';
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import BookingFlow from '@/pages/customer/BookingFlow';
import MyBookings from '@/pages/customer/MyBookings';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<ProtectedRoute allowedRoles={['admin']}><SetupWizard /></ProtectedRoute>} />
        {/* Public */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route index element={<AdminDashboard />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="appointments" element={<AdminBookings />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        {/* Staff */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff', 'receptionist']}><StaffLayout /></ProtectedRoute>}>
          <Route index element={<StaffDashboard />} />
          <Route path="appointments" element={<StaffAppointments />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>

        {/* Customer */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<CustomerDashboard />} />
          <Route path="book" element={<BookingFlow />} />
          <Route path="bookings" element={<MyBookings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;