import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  console.log('[SSE-SIMPLE] New connection')
  
  // Response body를 직접 스트리밍
  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Helper function to send SSE message
      const sendMessage = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }
      
      // Send initial connection message
      sendMessage({ type: 'connected', timestamp: new Date().toISOString() })
      
      // Send counter every second
      let counter = 0
      const interval = setInterval(() => {
        counter++
        console.log('[SSE-SIMPLE] Sending counter:', counter)
        sendMessage({ 
          type: 'counter', 
          value: counter, 
          timestamp: new Date().toISOString() 
        })
        
        if (counter >= 10) {
          clearInterval(interval)
          controller.close()
        }
      }, 1000)
      
      // Clean up on disconnect
      req.signal.addEventListener('abort', () => {
        console.log('[SSE-SIMPLE] Client disconnected')
        clearInterval(interval)
        controller.close()
      })
    }
  })
  
  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}