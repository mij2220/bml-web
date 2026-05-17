import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const client = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('bml_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('bml_refresh')
        const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh })
        localStorage.setItem('bml_access', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return client(original)
      } catch {
        localStorage.removeItem('bml_access')
        localStorage.removeItem('bml_refresh')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
