'use client'

import { useEffect, useState, useRef } from 'react'

export default function SSETestPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = (endpoint: string) => {
    // 기존 연결 종료
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus('connecting')
    setMessages(prev => [...prev, { type: 'info', text: `Connecting to ${endpoint}...`, time: new Date().toISOString() }])

    const eventSource = new EventSource(endpoint)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setStatus('connected')
      setMessages(prev => [...prev, { type: 'success', text: 'Connected!', time: new Date().toISOString() }])
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setMessages(prev => [...prev, { type: 'message', data, time: new Date().toISOString() }])
      } catch (e) {
        setMessages(prev => [...prev, { type: 'raw', text: event.data, time: new Date().toISOString() }])
      }
    }

    eventSource.onerror = (error) => {
      setStatus('disconnected')
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: `Error occurred. ReadyState: ${eventSource.readyState}`, 
        time: new Date().toISOString() 
      }])

      if (eventSource.readyState === EventSource.CLOSED) {
        setMessages(prev => [...prev, { type: 'info', text: 'Connection closed', time: new Date().toISOString() }])
      }
    }
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setStatus('disconnected')
      setMessages(prev => [...prev, { type: 'info', text: 'Disconnected', time: new Date().toISOString() }])
    }
  }

  const clear = () => {
    setMessages([])
  }

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SSE Connection Test</h1>
      
      <div className="mb-4">
        <div className={`inline-block px-4 py-2 rounded ${
          status === 'connected' ? 'bg-green-100 text-green-800' :
          status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          Status: {status}
        </div>
      </div>

      <div className="space-x-2 mb-4">
        <button
          onClick={() => connect('/api/admin/tracking/sse-working')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Connect (Working)
        </button>
        <button
          onClick={() => connect('/api/admin/tracking/stream')}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Connect (Original)
        </button>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
        <button
          onClick={clear}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 p-2 rounded ${
            msg.type === 'error' ? 'bg-red-100' :
            msg.type === 'success' ? 'bg-green-100' :
            msg.type === 'message' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            <span className="text-xs text-gray-500">
              [{new Date(msg.time).toLocaleTimeString()}]
            </span>
            {' '}
            {msg.type === 'message' ? (
              <span className="font-mono">
                {JSON.stringify(msg.data)}
              </span>
            ) : (
              <span>{msg.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}