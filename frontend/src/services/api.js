import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const unwrap = (request) => request.then((response) => response.data)

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const authAPI = {
  requestOTP: (phone, name) => unwrap(api.post('/auth/request-otp', { phone, name: name || undefined })),
  verifyOTP: (phone, code) => unwrap(api.post('/auth/verify-otp', { phone, code })),
  refreshToken: (refreshToken) =>
    unwrap(api.post('/auth/refresh', { refresh_token: refreshToken })),
  getMe: () => unwrap(api.get('/auth/me')),
}

export const subscriptionsAPI = {
  getPlans: () => unwrap(api.get('/subscriptions/plans')),
  getMySubscription: () => unwrap(api.get('/subscriptions/me')),
  purchase: (plan, paymentMethod) =>
    unwrap(api.post('/subscriptions/purchase', { plan, payment_method: paymentMethod })),
  switchPlan: (plan, paymentMethod) =>
    unwrap(api.post('/subscriptions/switch', { plan, payment_method: paymentMethod })),
  cancel: () => unwrap(api.post('/subscriptions/cancel', { confirm: true })),
}

export const shopsAPI = {
  listAll: () => unwrap(api.get('/shops')),
  nearby: (lat, lng, radiusKm = 5) =>
    unwrap(api.get('/shops/nearby', { params: { lat, lng, radius_km: radiusKm } })),
  search: (query) => unwrap(api.get('/shops/search', { params: { query } })),
  getDetail: (shopId) => unwrap(api.get(`/shops/${shopId}`)),
}

export const ordersAPI = {
  create: (shopId, productId, quantity, customizations) =>
    unwrap(
      api.post('/orders', {
        shop_id: shopId,
        product_id: productId,
        quantity,
        customizations,
      }),
    ),
  getDetail: (orderId) => unwrap(api.get(`/orders/${orderId}`)),
  updateStatus: (orderId, status) => unwrap(api.patch(`/orders/${orderId}`, { status })),
  verifyQR: (orderId, qrCodeJson) =>
    unwrap(api.post(`/orders/${orderId}/verify-qr`, { qr_code_json: qrCodeJson })),
  getHistory: () => unwrap(api.get('/orders/user/history')),
  getPendingForShop: (shopId) => unwrap(api.get(`/orders/shop/${shopId}/pending`)),
}

export default api
