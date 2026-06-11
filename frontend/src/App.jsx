import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import History from './pages/History.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Order from './pages/Order.jsx'
import OTP from './pages/OTP.jsx'
import OwnerOrders from './pages/OwnerOrders.jsx'
import QRCodePage from './pages/QRCode.jsx'
import Register from './pages/Register.jsx'
import ShopDetail from './pages/ShopDetail.jsx'
import Subscription from './pages/Subscription.jsx'

function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/otp" element={<OTP />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/home"
          element={
            <ProtectedRoute roles={['customer']}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop/:shopId"
          element={
            <ProtectedRoute roles={['customer']}>
              <ShopDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order"
          element={
            <ProtectedRoute roles={['customer']}>
              <Order />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr/:orderId"
          element={
            <ProtectedRoute roles={['customer']}>
              <QRCodePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute roles={['customer']}>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute roles={['customer']}>
              <Subscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/orders"
          element={
            <ProtectedRoute roles={['shop_owner']}>
              <OwnerOrders />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
