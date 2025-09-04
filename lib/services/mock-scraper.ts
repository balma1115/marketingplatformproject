// Mock 스크래퍼 - 테스트용
export interface SmartPlaceRankingResult {
  organicRank: number | null
  adRank: number | null
  found: boolean
  timestamp: Date
  topTenPlaces?: Array<{
    rank: number
    placeName: string
    placeId: string
    isAd: boolean
  }>
}

export class MockNaverScraper {
  async init() {
    console.log('Mock scraper initialized')
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<SmartPlaceRankingResult> {
    console.log(`Mock tracking for: ${keyword}`)
    
    // 랜덤 순위 생성 (테스트용)
    const found = Math.random() > 0.2 // 80% 확률로 찾음
    const organicRank = found ? Math.floor(Math.random() * 20) + 1 : null
    const adRank = found && Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null
    
    // Top 10 업체 생성
    const topTenPlaces = []
    for (let i = 1; i <= 10; i++) {
      topTenPlaces.push({
        rank: i,
        placeName: `테스트업체${i}`,
        placeId: `test${i}`,
        isAd: i <= 2 // 상위 2개는 광고
      })
    }
    
    // 타겟 업체 포함
    if (found && organicRank) {
      topTenPlaces[organicRank - 1] = {
        rank: organicRank,
        placeName: targetPlace.placeName,
        placeId: targetPlace.placeId,
        isAd: false
      }
    }
    
    return {
      organicRank,
      adRank,
      found,
      timestamp: new Date(),
      topTenPlaces
    }
  }

  async close() {
    console.log('Mock scraper closed')
  }
}