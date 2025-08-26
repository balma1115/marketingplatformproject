'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/layout/Header'

export default function DiagnosisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="container py-8">
          {children}
        </div>
      </main>
    </>
  )
}