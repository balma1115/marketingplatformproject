// 글로벌 이벤트 매니저 - SSE 이벤트 발생용
import { EventEmitter } from 'events';

class TrackingEventManager extends EventEmitter {
  private static instance: TrackingEventManager;
  private eventBuffer: Array<{ type: string; data: any; timestamp: string }> = [];
  private bufferEnabled: boolean = true;
  private maxBufferSize: number = 100;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): TrackingEventManager {
    if (!TrackingEventManager.instance) {
      TrackingEventManager.instance = new TrackingEventManager();
    }
    return TrackingEventManager.instance;
  }
  
  // SSE 연결 시 버퍼된 이벤트 플레이백
  flushBuffer(callback: (event: any) => void) {
    console.log(`[EventManager] Flushing ${this.eventBuffer.length} buffered events`);
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    events.forEach(event => {
      callback(event);
    });
  }
  
  // 버퍼링 활성화/비활성화
  setBuffering(enabled: boolean) {
    this.bufferEnabled = enabled;
    if (!enabled) {
      this.eventBuffer = [];
    }
  }
  
  // 작업 상태 업데이트 이벤트
  emitJobUpdate(data: any) {
    const eventData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    const listenerCount = this.listenerCount('job_update');
    console.log('[EventManager] Emitting job_update:', data);
    console.log('[EventManager] Listener count:', listenerCount);
    
    // 리스너가 없고 버퍼링이 활성화되어 있으면 버퍼에 저장
    if (listenerCount === 0 && this.bufferEnabled) {
      if (this.eventBuffer.length < this.maxBufferSize) {
        console.log('[EventManager] No listeners, buffering event');
        this.eventBuffer.push({
          type: 'job_update',
          data: eventData,
          timestamp: eventData.timestamp
        });
      }
    }
    
    this.emit('job_update', eventData);
  }
  
  // 시스템 상태 업데이트 이벤트
  emitStatusUpdate(data: any) {
    const eventData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    const listenerCount = this.listenerCount('status_update');
    
    if (listenerCount === 0 && this.bufferEnabled) {
      if (this.eventBuffer.length < this.maxBufferSize) {
        this.eventBuffer.push({
          type: 'status_update',
          data: eventData,
          timestamp: eventData.timestamp
        });
      }
    }
    
    this.emit('status_update', eventData);
  }
  
  // 로그 업데이트 이벤트
  emitLogUpdate(level: string, message: string, details?: any) {
    const eventData = {
      level,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    const listenerCount = this.listenerCount('log_update');
    
    if (listenerCount === 0 && this.bufferEnabled) {
      if (this.eventBuffer.length < this.maxBufferSize) {
        this.eventBuffer.push({
          type: 'log_update',
          data: eventData,
          timestamp: eventData.timestamp
        });
      }
    }
    
    this.emit('log_update', eventData);
  }
}

// Next.js에서 HMR 시에도 같은 인스턴스 유지
declare global {
  var trackingEventManagerInstance: TrackingEventManager | undefined;
}

// 싱글톤 인스턴스 (HMR에도 유지)
export const trackingEventManager = (() => {
  if (!global.trackingEventManagerInstance) {
    global.trackingEventManagerInstance = TrackingEventManager.getInstance();
  }
  return global.trackingEventManagerInstance;
})();