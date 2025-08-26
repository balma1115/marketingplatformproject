import { getNaverBlogScraperV2, closeNaverBlogScraperV2 } from './naver-blog-scraper-v2'

/**
 * 블로그 순위 추적 테스트
 * 
 * 테스트 시나리오:
 * - 블로그: https://blog.naver.com/miraen_beolwon (미래엔영어수학 벌원학원)
 * - 키워드: 벌원초영어학원
 * 
 * 예상 결과 (가설):
 * - 통합검색 메인탭: 노출됨 (여러 게시물)
 * - 블로그탭: 2위 근처
 */
export async function testBlogRanking() {
  const testCases = [
    {
      blogUrl: 'https://blog.naver.com/miraen_beolwon',
      keywords: ['벌원초영어학원', '탄벌동영어학원', '벌원학원'],
      expectedResults: {
        '벌원초영어학원': {
          mainTabExposed: true,  // 통합검색에 노출될 것으로 예상
          blogTabRank: [1, 3],    // 블로그탭 1-3위 사이일 것으로 예상 (실제: 2위)
        },
        '탄벌동영어학원': {
          mainTabExposed: false,
          blogTabRank: [30, 100],  // 순위권 외
        },
        '벌원학원': {
          mainTabExposed: false,
          blogTabRank: [20, 25],  // 블로그탭 20-25위 사이일 것으로 예상 (실제: 23위)
        }
      }
    }
  ]

  console.log('=== 블로그 순위 추적 테스트 시작 ===\n')
  
  let scraper = null
  
  try {
    scraper = await getNaverBlogScraperV2()
    
    for (const testCase of testCases) {
      console.log(`테스트 블로그: ${testCase.blogUrl}`)
      console.log('----------------------------------------')
      
      for (const keyword of testCase.keywords) {
        console.log(`\n키워드: "${keyword}" 검색 중...`)
        
        const result = await scraper.checkBlogRanking(testCase.blogUrl, keyword)
        
        console.log(`결과:`)
        console.log(`  - 통합검색 노출: ${result.mainTabExposed ? '✅ 예' : '❌ 아니오'}`)
        console.log(`  - 블로그탭 순위: ${result.blogTabRank || '순위권 외'}`)
        
        // 예상 결과와 비교
        const expected = testCase.expectedResults[keyword as keyof typeof testCase.expectedResults]
        if (expected) {
          console.log(`\n예상 vs 실제:`)
          
          // 통합검색 노출 검증
          if (expected.mainTabExposed) {
            const mainTabTest = result.mainTabExposed === expected.mainTabExposed
            console.log(`  - 통합검색 노출: ${mainTabTest ? '✅ PASS' : '❌ FAIL'}`)
          }
          
          // 블로그탭 순위 검증
          if (expected.blogTabRank && result.blogTabRank) {
            const [min, max] = expected.blogTabRank
            const blogTabTest = result.blogTabRank >= min && result.blogTabRank <= max
            console.log(`  - 블로그탭 순위 (${min}-${max}위 예상): ${blogTabTest ? '✅ PASS' : '❌ FAIL'} (실제: ${result.blogTabRank}위)`)
          }
        }
        
        // API 제한 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      console.log('\n========================================')
    }
    
    console.log('\n✅ 테스트 완료!')
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error)
  } finally {
    if (scraper) {
      await closeNaverBlogScraperV2()
    }
  }
}

// 독립 실행 가능한 테스트
if (require.main === module) {
  testBlogRanking()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}