import axios from 'axios'

// Create axios instance with default config
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true, // Always send cookies
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor to add auth token if available in localStorage (fallback)
axiosClient.interceptors.request.use(
  (config) => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      // Try to get token from localStorage as fallback
      const token = localStorage.getItem('token')
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // Could redirect to login page here if needed
      console.error('Unauthorized access - redirecting to login')
      // Only redirect in browser environment
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosClient