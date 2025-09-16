import axios from 'axios'

class NaverAutocompleteService {
  private baseUrl = 'https://ac.search.naver.com/nx/ac'
  
  async getAutocompleteKeywords(keyword: string): Promise<string[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: keyword,
          con: '1',
          frm: 'nv',
          ans: '2',
          r_format: 'json',
          r_enc: 'UTF-8',
          st: '100',
          q_enc: 'UTF-8'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.naver.com/',
          'Origin': 'https://www.naver.com'
        }
      })

      // 응답 데이터 파싱
      const items = response.data?.items || []
      const keywords: string[] = []
      
      // items[0]은 자동완성 키워드 목록
      if (items[0] && Array.isArray(items[0])) {
        items[0].forEach((item: any[]) => {
          if (item[0] && typeof item[0] === 'string') {
            keywords.push(item[0])
          }
        })
      }
      
      return keywords
      
    } catch (error) {
      console.error('네이버 자동완성 API 오류:', error)
      
      // 오류 발생 시 빈 배열 반환
      return []
    }
  }
  
  // 여러 키워드에 대한 자동완성 조회 (배치 처리)
  async getBatchAutocompleteKeywords(keywords: string[]): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>()
    
    // 순차적으로 처리 (너무 많은 동시 요청 방지)
    for (const keyword of keywords) {
      const autocompleteKeywords = await this.getAutocompleteKeywords(keyword)
      results.set(keyword, autocompleteKeywords)
      
      // API 호출 간격 (Rate limiting 방지)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return results
  }
  
  // 자동완성 키워드를 검색량 기준으로 필터링 (추후 구현 가능)
  filterBySearchVolume(keywords: string[], minVolume: number = 100): string[] {
    // 현재는 단순히 키워드 반환
    // 추후 검색량 데이터와 연동하여 필터링 가능
    return keywords
  }
  
  // 키워드 정제 (특수문자 제거, 정규화)
  normalizeKeywords(keywords: string[]): string[] {
    return keywords.map(keyword => {
      // HTML 태그 제거
      keyword = keyword.replace(/<[^>]*>/g, '')
      
      // 특수문자 제거 (한글, 영문, 숫자, 공백만 유지)
      keyword = keyword.replace(/[^\w\s가-힣]/g, '')
      
      // 연속된 공백을 하나로
      keyword = keyword.replace(/\s+/g, ' ')
      
      // 앞뒤 공백 제거
      keyword = keyword.trim()
      
      return keyword
    }).filter(keyword => keyword.length > 0)
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const naverAutocompleteService = new NaverAutocompleteService()