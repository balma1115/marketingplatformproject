'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DiagnosisPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/diagnosis/smartplace')
  }, [router])
  
  return null
}