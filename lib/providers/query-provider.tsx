'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분간 데이터 캐싱
            staleTime: 5 * 60 * 1000,
            // 10분간 캐시 유지
            gcTime: 10 * 60 * 1000,
            // 창 포커스시 자동 refetch 비활성화
            refetchOnWindowFocus: false,
            // 재연결시 자동 refetch 비활성화
            refetchOnReconnect: false,
            // 3번 재시도
            retry: 3,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}