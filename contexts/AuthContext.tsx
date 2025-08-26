'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  name: string
  role: string
  plan: string
  academyName?: string
  coin: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  academyName?: string
  academyAddress?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      setUser(data.user)

      // Redirect based on role
      switch (data.user.role) {
        case 'admin':
          router.push('/dashboard/admin')
          break
        case 'agency':
          router.push('/dashboard/agency')
          break
        case 'branch':
          router.push('/dashboard/branch')
          break
        case 'academy':
          router.push('/dashboard/academy')
          break
        default:
          router.push('/dashboard/user')
      }
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (data: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const result = await response.json()
    setUser(result.user)
    router.push('/dashboard/user')
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}