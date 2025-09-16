import { NextRequest } from 'next/server'

// Next.js App Router에서 SSE를 위한 runtime 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[SSE-WORKING] New connection')
  
  // 인코더
  const encoder = new TextEncoder()
  
  // 커스텀 ReadableStream 생성
  const customReadable = new ReadableStream({
    start(controller) {
      console.log('[SSE-WORKING] Stream started')
      
      // 초기 연결 메시지
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`)
      )
      
      // 1초마다 메시지 전송
      let counter = 0
      const intervalId = setInterval(() => {
        counter++
        const data = JSON.stringify({
          type: 'update',
          counter,
          time: new Date().toISOString()
        })
        
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          console.log('[SSE-WORKING] Sent update:', counter)
          
          // 10번 후 종료
          if (counter >= 10) {
            clearInterval(intervalId)
            controller.close()
          }
        } catch (error) {
          console.error('[SSE-WORKING] Error sending:', error)
          clearInterval(intervalId)
        }
      }, 1000)
      
      // 클라이언트 연결 종료 감지
      req.signal.addEventListener('abort', () => {
        console.log('[SSE-WORKING] Client disconnected')
        clearInterval(intervalId)
        controller.close()
      })
    },
  })
  
  // SSE 응답 반환
  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}