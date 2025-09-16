/**
 * Cache Manager for API Data
 * 
 * 캐싱 전략:
 * 1. 구조적 데이터 (캠페인, 광고그룹, 키워드 등): 5분 캐싱
 * 2. 통계 데이터: 날짜 범위별로 별도 캐싱 (1시간)
 * 3. 실시간 상태 변경: 캐시 무효화
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresIn: number
}

interface StatsCacheKey {
  baseKey: string
  dateFrom: string
  dateTo: string
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  
  // 캐시 TTL 설정 (밀리초)
  private readonly TTL = {
    STRUCTURE: 5 * 60 * 1000,      // 5분: 캠페인, 광고그룹 구조
    STATS: 30 * 1000,               // 30초: 통계 데이터 (테스트를 위해 짧게 설정)
    KEYWORDS: 10 * 60 * 1000,       // 10분: 키워드 목록
    ADS: 10 * 60 * 1000,            // 10분: 광고 소재
    REALTIME: 0                     // 캐싱 안함: 실시간 상태
  }

  /**
   * 구조적 데이터 캐싱 (캠페인, 광고그룹 등)
   */
  setStructureData<T>(key: string, data: T, customTTL?: number): void {
    const expiresIn = customTTL || this.TTL.STRUCTURE
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    })
  }

  /**
   * 통계 데이터 캐싱 (날짜 범위 포함)
   */
  setStatsData<T>(baseKey: string, dateFrom: string, dateTo: string, data: T): void {
    const key = this.getStatsKey(baseKey, dateFrom, dateTo)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: this.TTL.STATS
    })
  }

  /**
   * 캐시된 데이터 가져오기
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // 만료 확인
    if (Date.now() - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * 통계 데이터 가져오기 (날짜 범위 포함)
   */
  getStats<T>(baseKey: string, dateFrom: string, dateTo: string): T | null {
    const key = this.getStatsKey(baseKey, dateFrom, dateTo)
    return this.get<T>(key)
  }

  /**
   * 특정 패턴의 캐시 무효화
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }
  
  /**
   * 모든 통계 캐시 삭제
   */
  clearStatsCache(): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(':stats:')) {
        this.cache.delete(key)
        console.log(`[Cache] Cleared stats cache: ${key}`)
      }
    })
  }

  /**
   * 캠페인 관련 캐시 무효화
   */
  invalidateCampaign(campaignId: string): void {
    this.invalidatePattern(`campaign:${campaignId}`)
    this.invalidatePattern(`campaigns`) // 목록도 무효화
  }

  /**
   * 광고그룹 관련 캐시 무효화
   */
  invalidateAdGroup(adgroupId: string): void {
    this.invalidatePattern(`adgroup:${adgroupId}`)
    this.invalidatePattern(`adgroups`) // 목록도 무효화
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 캐시 크기 확인
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 통계 캐시 키 생성
   */
  private getStatsKey(baseKey: string, dateFrom: string, dateTo: string): string {
    return `${baseKey}:stats:${dateFrom}:${dateTo}`
  }

  /**
   * 캐시 상태 디버깅
   */
  debug(): void {
    console.log('=== Cache Manager Debug ===')
    console.log(`Total entries: ${this.cache.size}`)
    
    this.cache.forEach((entry, key) => {
      const age = Date.now() - entry.timestamp
      const remaining = entry.expiresIn - age
      console.log(`Key: ${key}`)
      console.log(`  Age: ${Math.round(age / 1000)}s`)
      console.log(`  Remaining: ${Math.round(remaining / 1000)}s`)
      console.log(`  Expired: ${remaining < 0}`)
    })
  }
}

// Singleton 인스턴스
const cacheManager = new CacheManager()

// 캐시 키 생성 헬퍼 함수들
export const CacheKeys = {
  // 캠페인 관련
  campaigns: () => 'campaigns:list',
  campaign: (id: string) => `campaign:${id}`,
  campaignStats: (id: string) => `campaign:${id}:stats`,
  
  // 광고그룹 관련  
  adGroups: (campaignId?: string) => campaignId ? `adgroups:campaign:${campaignId}` : 'adgroups:list',
  adGroup: (id: string) => `adgroup:${id}`,
  adGroupStats: (id: string) => `adgroup:${id}:stats`,
  
  // 키워드 관련
  keywords: (adgroupId: string) => `keywords:adgroup:${adgroupId}`,
  keywordStats: (adgroupId: string) => `keywords:adgroup:${adgroupId}:stats`,
  
  // 광고 소재 관련
  ads: (adgroupId: string) => `ads:adgroup:${adgroupId}`,
  adStats: (adgroupId: string) => `ads:adgroup:${adgroupId}:stats`,
  
  // 확장소재 관련
  extensions: (adgroupId: string) => `extensions:adgroup:${adgroupId}`,
  
  // 제외 키워드
  negativeKeywords: (adgroupId: string) => `negative-keywords:adgroup:${adgroupId}`,
  
  // 상품 (쇼핑)
  products: (adgroupId: string) => `products:adgroup:${adgroupId}`
}

// API 호출 래퍼 함수
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number
    forceRefresh?: boolean
  }
): Promise<T> {
  const { ttl, forceRefresh = false } = options || {}
  
  // 강제 새로고침이 아니면 캐시 확인
  if (!forceRefresh) {
    const cached = cacheManager.get<T>(key)
    if (cached !== null) {
      console.log(`[Cache Hit] ${key}`)
      return cached
    }
  }
  
  console.log(`[Cache Miss] ${key} - Fetching from API`)
  
  // API 호출
  const data = await fetcher()
  
  // 캐시 저장
  cacheManager.setStructureData(key, data, ttl)
  
  return data
}

// 통계 데이터용 API 호출 래퍼
export async function fetchStatsWithCache<T>(
  baseKey: string,
  dateFrom: string,
  dateTo: string,
  fetcher: () => Promise<T>,
  options?: {
    forceRefresh?: boolean
  }
): Promise<T> {
  const { forceRefresh = false } = options || {}
  
  // 강제 새로고침이 아니면 캐시 확인
  if (!forceRefresh) {
    const cached = cacheManager.getStats<T>(baseKey, dateFrom, dateTo)
    if (cached !== null) {
      console.log(`[Stats Cache Hit] ${baseKey} (${dateFrom} ~ ${dateTo})`)
      return cached
    }
  }
  
  console.log(`[Stats Cache Miss] ${baseKey} (${dateFrom} ~ ${dateTo}) - Fetching from API`)
  
  // API 호출
  const data = await fetcher()
  
  // 캐시 저장
  cacheManager.setStatsData(baseKey, dateFrom, dateTo, data)
  
  return data
}

export default cacheManager