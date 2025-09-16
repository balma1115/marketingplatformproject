import { NextRequest } from 'next/server'

// 가설 1: 간단한 SSE 구현으로 Next.js에서 작동 확인
export async function GET(req: NextRequest) {
  console.log('[SSE-TEST] Connection request received')
  
  const encoder = new TextEncoder()
  
  // 방법 1: TransformStream 사용
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // 즉시 연결 확인 메시지 전송
  writer.write(encoder.encode(': ping\n\n'))
  writer.write(encoder.encode('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n'))
  
  // 1초마다 카운터 전송
  let counter = 0
  const interval = setInterval(async () => {
    try {
      counter++
      const message = `data: {"type":"counter","value":${counter},"timestamp":"${new Date().toISOString()}"}\n\n`
      console.log('[SSE-TEST] Sending counter:', counter)
      await writer.write(encoder.encode(message))
      
      // 10번 후 종료
      if (counter >= 10) {
        clearInterval(interval)
        await writer.close()
      }
    } catch (error) {
      console.error('[SSE-TEST] Write error:', error)
      clearInterval(interval)
    }
  }, 1000)
  
  // 연결 종료 시 정리
  req.signal.addEventListener('abort', () => {
    console.log('[SSE-TEST] Client disconnected')
    clearInterval(interval)
    writer.close().catch(() => {})
  })
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}