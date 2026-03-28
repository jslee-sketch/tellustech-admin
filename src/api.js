import axios from 'axios'

const api = axios.create({
  baseURL: 'https://tellustech-admin-production.up.railway.app',
  headers: { 'Content-Type': 'application/json' },
})

// 요청 인터셉터: JWT 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('tl-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 401이면 세션 정리 후 로그인으로 이동
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('tl-token')
      sessionStorage.removeItem('tl-user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
