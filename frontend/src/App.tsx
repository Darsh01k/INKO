import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AreaGuard } from '@/components/AreaGuard'
import { RoleRedirect } from '@/components/RoleRedirect'
import { CustomerShell } from '@/layouts/CustomerShell'
import { ShopShell } from '@/layouts/ShopShell'
import { AdminShell } from '@/layouts/AdminShell'
import ShopLogin from '@/pages/ShopLogin'
import AdminLogin from '@/pages/AdminLogin'
import Welcome from '@/pages/Welcome'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import Configure from '@/pages/Configure'
import OrderDetail from '@/pages/OrderDetail'
import Queue from '@/pages/Queue'
import History from '@/pages/History'
import ShopQueueManage from '@/pages/shop/QueueManage'
import ShopDashboard from '@/pages/shop/Dashboard'
import ShopQr from '@/pages/shop/Qr'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminShops from '@/pages/admin/Shops'
import AdminUsers from '@/pages/admin/Users'
import AdminOrders from '@/pages/admin/Orders'
import AdminAudit from '@/pages/admin/Audit'
import AdminComplaints from '@/pages/admin/Complaints'
import ShopPricing from '@/pages/shop/Pricing'
import { Profile, SettingsPage } from '@/pages/Account'
import QrScan from '@/pages/QrScan'
import ShopPrint from '@/pages/ShopPrint'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Unified welcome / sign-in / registration — routes each user to their console */}
        <Route path="/login" element={<Welcome />} />
        <Route path="/register" element={<Welcome />} />
        <Route path="/shop/login" element={<ShopLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/customer/login" element={<Navigate to="/login" replace />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/qr/:code" element={<QrScan />} />
        <Route path="/shops/:shopId/print" element={<ShopPrint />} />

        {/* Login-optional customer workflow (QR scan / guest printing) */}
        <Route element={<CustomerShell />}>
          <Route path="/upload" element={<Upload />} />
          <Route path="/configure" element={<Configure />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/queue/:id" element={<Queue />} />
        </Route>

        {/* Console-isolated areas: one session = one dashboard */}
        <Route element={<AreaGuard area="customer" />}>
          <Route element={<CustomerShell />}>
            <Route path="/customer/dashboard" element={<Dashboard />} />
            <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer/profile" element={<Profile home="/customer/dashboard" />} />
            <Route path="/customer/settings" element={<SettingsPage home="/customer/dashboard" />} />
            <Route path="/history" element={<History />} />
          </Route>
        </Route>

        <Route element={<AreaGuard area="shop" />}>
          <Route element={<ShopShell />}>
            <Route path="/shop/dashboard" element={<ShopDashboard />} />
            <Route path="/shop/queue" element={<ShopQueueManage />} />
            <Route path="/shop/pricing" element={<ShopPricing />} />
            <Route path="/shop/qr" element={<ShopQr />} />
            <Route path="/shop/profile" element={<Profile home="/shop/dashboard" />} />
            <Route path="/shop/settings" element={<SettingsPage home="/shop/dashboard" />} />
          </Route>
        </Route>

        <Route element={<AreaGuard area="admin" />}>
          <Route element={<AdminShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/shops" element={<AdminShops />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/profile" element={<Profile home="/admin/dashboard" />} />
            <Route path="/admin/settings" element={<SettingsPage home="/admin/dashboard" />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<RoleRedirect />} />

        <Route path="/shops" element={<div className="p-6">Shop discovery — see /customer/dashboard</div>} />
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<main className="flex min-h-screen flex-col items-center justify-center gap-4"><h1 className="text-4xl font-bold tracking-tight">Inko</h1><p className="text-slate-500">Page not found — <a href="/customer/dashboard" className="text-indigo-600 underline">go home</a></p></main>} />
      </Routes>
    </AuthProvider>
  )
}
