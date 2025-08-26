# 스마트플레이스 분석 진단 시스템 - 독립 실행 가능 코드

## 📌 개요
네이버 스마트플레이스를 분석하고 진단하는 독립 실행 가능한 시스템입니다.
다른 프로젝트에 그대로 이식하여 사용할 수 있도록 모든 필요한 코드를 포함합니다.

## 📦 필요한 패키지 설치

### Backend 패키지
```bash
npm install express axios playwright typescript @types/express @types/node
npm install --save-dev nodemon ts-node
```

### Frontend 패키지
```bash
npm install react react-dom axios html2canvas lucide-react
npm install --save-dev @types/react @types/react-dom typescript
```

## 🗂️ 프로젝트 구조
```
smartplace-analysis/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── smartplace.routes.ts
│   │   ├── services/
│   │   │   ├── naverMapService.ts
│   │   │   └── playwrightCrawlerService.ts
│   │   └── server.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── SmartPlaceAnalysis.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── styles/
│   │   │   └── SmartPlaceAnalysis.css
│   │   └── App.tsx
│   └── package.json
```

## 🔧 Backend 코드

### 1. server.ts - Express 서버 메인 파일
```typescript
// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import smartplaceRoutes from './routes/smartplace.routes';

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/smartplace', smartplaceRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 2. smartplace.routes.ts - 라우터 전체 코드
```typescript
// backend/src/routes/smartplace.routes.ts
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { naverMapService } from '../services/naverMapService';

const router = Router();

// 단축 URL을 원본 URL로 변환하는 함수
async function resolveShortUrl(shortUrl: string): Promise<string> {
  try {
    // axios를 사용하여 리다이렉트를 따라가기
    const response = await axios.get(shortUrl, {
      maxRedirects: 5, // 최대 5번까지 리다이렉트 따라가기
      validateStatus: () => true, // 모든 상태 코드 허용
      // 리다이렉트를 추적하기 위한 interceptor
      beforeRedirect: (options: any, responseDetails: any) => {
        console.log('Redirecting to:', responseDetails.headers.location);
      }
    });
    
    // 최종 URL 반환 (response.request.res.responseUrl 또는 response.config.url)
    const finalUrl = response.request.res?.responseUrl || response.config.url || shortUrl;
    console.log('Final URL after redirects:', finalUrl);
    
    return finalUrl;
  } catch (error: any) {
    console.error('Error resolving URL:', error);
    
    // HEAD 요청으로 재시도
    try {
      const headResponse = await axios.head(shortUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status === 301 || status === 302 || status === 303 || status === 307 || status === 308
      });
      
      if (headResponse.headers.location) {
        return headResponse.headers.location;
      }
    } catch (headError: any) {
      if (headError.response?.headers?.location) {
        return headError.response.headers.location;
      }
    }
    
    throw new Error('URL을 변환할 수 없습니다.');
  }
}

// Place ID 추출 함수
function extractPlaceId(url: string): string | null {
  // naver.me 단축 URL인 경우
  if (url.includes('naver.me/')) {
    return null; // 단축 URL은 먼저 원본으로 변환 필요
  }
  
  // 다양한 네이버 플레이스 URL 패턴 처리
  const patterns = [
    /place\.naver\.com\/restaurant\/(\d+)/,
    /place\.map\.naver\.com\/restaurant\/(\d+)/,
    /map\.naver\.com\/.*\/place\/(\d+)/,
    /m\.place\.naver\.com\/restaurant\/(\d+)/,
    /m\.place\.naver\.com\/place\/(\d+)/,
    /place\.naver\.com\/place\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// URL 처리 엔드포인트
router.post('/resolve-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL이 필요합니다.'
      });
    }

    console.log('=== RESOLVE URL REQUEST ===');
    console.log('Input URL:', url);

    let finalUrl = url;
    let placeId = null;

    // naver.me 단축 URL인 경우 원본 URL로 변환
    if (url.includes('naver.me/')) {
      try {
        finalUrl = await resolveShortUrl(url);
        console.log('Resolved URL:', finalUrl);
      } catch (error) {
        console.error('Error resolving short URL:', error);
        return res.status(400).json({
          success: false,
          error: '단축 URL을 변환할 수 없습니다.'
        });
      }
    }

    // Place ID 추출
    placeId = extractPlaceId(finalUrl);
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: '유효한 스마트플레이스 URL이 아닙니다.'
      });
    }

    return res.json({
      success: true,
      data: {
        originalUrl: url,
        resolvedUrl: finalUrl,
        placeId: placeId
      }
    });
  } catch (error: any) {
    console.error('Error in resolve URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'URL 처리 중 오류가 발생했습니다.'
    });
  }
});

// 스마트플레이스 정보 조회
router.get('/info/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Place ID가 필요합니다.'
      });
    }

    console.log('=== SMARTPLACE INFO REQUEST ===');
    console.log('Place ID:', placeId);

    const placeInfo = await naverMapService.getSmartPlaceInfo(placeId);

    return res.json({
      success: true,
      data: placeInfo
    });
  } catch (error: any) {
    console.error('Error in smartplace info:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '스마트플레이스 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 스마트플레이스 분석
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.body;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Place ID가 필요합니다.'
      });
    }

    console.log('=== SMARTPLACE ANALYZE REQUEST ===');
    console.log('Place ID:', placeId);

    // 정보 가져오기
    const placeInfo = await naverMapService.getSmartPlaceInfo(placeId);

    // 분석 결과 생성
    const analysis = {
      basicInfo: placeInfo,
      score: {
        informationCompleteness: calculateInfoScore(placeInfo),
        visualContent: calculateVisualScore(placeInfo),
        customerEngagement: calculateEngagementScore(placeInfo),
        overall: 0
      },
      recommendations: generateRecommendations(placeInfo)
    };

    // 전체 점수 계산
    analysis.score.overall = Math.round(
      (analysis.score.informationCompleteness + 
       analysis.score.visualContent + 
       analysis.score.customerEngagement) / 3
    );

    return res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('Error in smartplace analyze:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '스마트플레이스 분석 중 오류가 발생했습니다.'
    });
  }
});

// 정보 완성도 점수 계산
function calculateInfoScore(info: any): number {
  let score = 0;
  const totalPoints = 100;
  
  if (info.name) score += 10;
  if (info.category) score += 10;
  if (info.address) score += 10;
  if (info.phone) score += 10;
  if (info.businessHours) score += 15;
  if (info.description) score += 15;
  if (info.amenities && info.amenities.length > 0) score += 10;
  if (info.keywords && info.keywords.length > 0) score += 10;
  if (info.hasReservation || info.hasInquiry) score += 10;
  
  return Math.min(score, totalPoints);
}

// 시각적 콘텐츠 점수 계산
function calculateVisualScore(info: any): number {
  let score = 0;
  
  if (info.images && info.images.length > 0) {
    score = Math.min(info.images.length * 10, 100);
  }
  
  return score;
}

// 고객 참여도 점수 계산
function calculateEngagementScore(info: any): number {
  let score = 0;
  
  if (info.hasReservation) score += 30;
  if (info.hasInquiry) score += 30;
  if (info.tabs && info.tabs.includes('리뷰')) score += 20;
  if (info.tabs && info.tabs.includes('이벤트')) score += 20;
  
  return score;
}

// 개선 권장사항 생성
function generateRecommendations(info: any): string[] {
  const recommendations: string[] = [];
  
  if (!info.businessHours) {
    recommendations.push('영업시간 정보를 추가하세요.');
  }
  if (!info.description || info.description.length < 50) {
    recommendations.push('업체 소개를 더 자세히 작성하세요.');
  }
  if (!info.images || info.images.length < 5) {
    recommendations.push('더 많은 사진을 추가하여 시각적 매력을 높이세요.');
  }
  if (!info.hasReservation) {
    recommendations.push('네이버 예약 기능을 활성화하여 고객 편의를 높이세요.');
  }
  if (!info.amenities || info.amenities.length === 0) {
    recommendations.push('편의시설 정보를 추가하세요.');
  }
  if (!info.keywords || info.keywords.length < 3) {
    recommendations.push('검색 노출을 위한 키워드를 더 추가하세요.');
  }
  
  return recommendations;
}

export default router;
```

### 3. naverMapService.ts - 네이버 맵 서비스
```typescript
// backend/src/services/naverMapService.ts
import { playwrightCrawlerService } from './playwrightCrawlerService';

interface SmartPlaceInfo {
  id: string;
  name: string;
  category: string;
  businessHours?: string;
  phone?: string;
  address?: string;
  hasReservation?: boolean;
  hasInquiry?: boolean;
  hasCoupon?: boolean;
  tabs?: string[];
  description?: string;
  images?: string[];
  amenities?: string[];
  keywords?: string[];
  visitorReviewCount?: number;
  blogReviewCount?: number;
  directions?: string;
  blogLink?: string;
  instagramLink?: string;
  introduction?: string;
  representativeKeywords?: string[];
  educationInfo?: {
    hasRegistrationNumber: boolean;
    hasTuitionFee: boolean;
    registrationNumber?: string;
    tuitionFees?: string[];
  };
  imageRegistrationDates?: string[];
  hasClipTab?: boolean;
  newsUpdateDates?: string[];
  visitorReviews?: Array<{
    date: string;
    hasReply: boolean;
  }>;
  blogReviews?: string[];
  hasSmartCall?: boolean;
  priceDisplay?: {
    hasText: boolean;
    hasImage: boolean;
  };
}

export class NaverMapService {

  async getSmartPlaceInfo(placeId: string): Promise<SmartPlaceInfo> {
    try {
      console.log('=== NAVER MAP SERVICE: getSmartPlaceInfo ===');
      console.log('Place ID:', placeId);

      // Playwright 크롤러 서비스를 사용하여 정보 가져오기
      const placeDetail = await playwrightCrawlerService.getPlaceDetails(placeId);
      
      // SmartPlaceInfo 형식으로 변환
      const smartPlaceInfo: SmartPlaceInfo = {
        id: placeId,
        name: placeDetail.name || `업체 (ID: ${placeId})`,
        category: placeDetail.category || '분류 정보 없음',
        businessHours: placeDetail.businessHours || '영업시간 정보 없음',
        phone: placeDetail.phone || '',
        address: placeDetail.address || '',
        hasReservation: placeDetail.hasReservation,
        hasInquiry: placeDetail.hasInquiry,
        hasCoupon: placeDetail.hasCoupon,
        tabs: placeDetail.tabs.length > 0 ? placeDetail.tabs : ['홈'],
        description: placeDetail.description || '',
        images: placeDetail.images || [],
        amenities: placeDetail.amenities,
        keywords: placeDetail.keywords,
        visitorReviewCount: placeDetail.visitorReviewCount,
        blogReviewCount: placeDetail.blogReviewCount,
        directions: placeDetail.directions,
        blogLink: placeDetail.blogLink,
        instagramLink: placeDetail.instagramLink,
        introduction: placeDetail.introduction,
        representativeKeywords: placeDetail.representativeKeywords,
        educationInfo: placeDetail.educationInfo,
        imageRegistrationDates: placeDetail.imageRegistrationDates,
        hasClipTab: placeDetail.hasClipTab,
        newsUpdateDates: placeDetail.newsUpdateDates,
        visitorReviews: placeDetail.visitorReviews,
        blogReviews: placeDetail.blogReviews,
        hasSmartCall: placeDetail.hasSmartCall,
        priceDisplay: placeDetail.priceDisplay
      };

      console.log('=== FINAL SMARTPLACE INFO ===');
      console.log('Extracted info:', JSON.stringify(smartPlaceInfo, null, 2));
      
      return smartPlaceInfo;

    } catch (error: any) {
      console.error('Error in getSmartPlaceInfo:', error.message);
      throw new Error(`스마트플레이스 정보를 가져올 수 없습니다: ${error.message}`);
    }
  }
}

export const naverMapService = new NaverMapService();
```

### 4. playwrightCrawlerService.ts - Playwright 크롤러 (전체 구현)
```typescript
// backend/src/services/playwrightCrawlerService.ts
import { chromium, Browser, Page } from 'playwright';

interface PlaceDetail {
  name: string;
  category: string;
  address: string;
  phone: string;
  businessHours: string;
  description: string;
  tabs: string[];
  hasReservation: boolean;
  hasInquiry: boolean;
  hasCoupon?: boolean;
  amenities: string[];
  keywords: string[];
  images: string[];
  visitorReviewCount?: number;
  blogReviewCount?: number;
  directions?: string;
  blogLink?: string;
  instagramLink?: string;
  introduction?: string;
  representativeKeywords?: string[];
  educationInfo?: {
    hasRegistrationNumber: boolean;
    hasTuitionFee: boolean;
    registrationNumber?: string;
    tuitionFees?: string[];
  };
  imageRegistrationDates?: string[];
  hasClipTab?: boolean;
  newsUpdateDates?: string[];
  visitorReviews?: Array<{
    date: string;
    hasReply: boolean;
  }>;
  blogReviews?: string[];
  hasSmartCall?: boolean;
  priceDisplay?: {
    hasText: boolean;
    hasImage: boolean;
  };
}

export class PlaywrightCrawlerService {
  private browser: Browser | null = null;

  async initialize() {
    if (!this.browser) {
      console.log('Initializing Playwright browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox'
        ]
      });
      console.log('Playwright browser initialized');
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetail> {
    await this.initialize();
    
    const context = await this.browser!.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    try {
      console.log(`Navigating to place ${placeId}...`);
      const url = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,0,dh`;
      
      console.log('URL:', url);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(5000);
      
      // iframe 찾기 로직
      console.log(`\n=== SEARCHING FOR TARGET IFRAME ===`);
      let workingPage: Page | any = null;
      let placeName = '';
      
      try {
        // 1. 먼저 #entryIframe으로 정확한 iframe 찾기
        console.log('🔍 entryIframe 찾기 시작...');
        const entryIframe = await page.$('#entryIframe');
        if (entryIframe) {
          const entryFrame = await entryIframe.contentFrame();
          if (entryFrame) {
            console.log('✅ entryIframe 발견 및 접근 성공');
            workingPage = entryFrame;
          }
        }
      } catch (error: any) {
        console.log('entryIframe 접근 오류:', error.message);
      }
      
      // 2. entryIframe에서 찾지 못한 경우 모든 iframe 검색
      if (!workingPage) {
        console.log('\n🔍 대체 iframe 검색 시작...');
        const iframes = await page.$$('iframe');
        console.log(`총 ${iframes.length}개의 iframe 발견`);
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            const frame = await iframes[i].contentFrame();
            if (frame) {
              const titleElement = await frame.$('#_title > div > span.GHAhO');
              if (titleElement) {
                placeName = await frame.evaluate(el => el.textContent, titleElement) || '';
                if (placeName.trim()) {
                  workingPage = frame;
                  console.log(`*** 업체명 찾음 (iframe ${i}) ***`);
                  console.log('업체명:', placeName);
                  break;
                }
              }
            }
          } catch (error) {
            // iframe 접근 실패 시 다음 iframe으로
            continue;
          }
        }
      }

      // 작업할 페이지가 없으면 메인 페이지 사용
      if (!workingPage) {
        console.log('iframe을 찾을 수 없어 메인 페이지 사용');
        workingPage = page;
      }

      // 정보 추출
      const placeDetail: PlaceDetail = await this.extractPlaceInfo(workingPage, placeId);
      
      return placeDetail;
      
    } finally {
      await context.close();
    }
  }

  private async extractPlaceInfo(page: any, placeId: string): Promise<PlaceDetail> {
    const placeDetail: PlaceDetail = {
      name: '',
      category: '',
      address: '',
      phone: '',
      businessHours: '',
      description: '',
      tabs: [],
      hasReservation: false,
      hasInquiry: false,
      hasCoupon: false,
      amenities: [],
      keywords: [],
      images: [],
      visitorReviewCount: 0,
      blogReviewCount: 0,
      directions: '',
      blogLink: '',
      instagramLink: '',
      introduction: '',
      representativeKeywords: [],
      educationInfo: {
        hasRegistrationNumber: false,
        hasTuitionFee: false
      },
      imageRegistrationDates: [],
      hasClipTab: false,
      newsUpdateDates: [],
      visitorReviews: [],
      blogReviews: [],
      hasSmartCall: false,
      priceDisplay: {
        hasText: false,
        hasImage: false
      }
    };

    try {
      // 업체명
      const nameElement = await page.$('#_title > div > span.GHAhO');
      if (nameElement) {
        placeDetail.name = await page.evaluate((el: any) => el.textContent, nameElement) || '';
      }

      // 카테고리
      const categoryElement = await page.$('.DJJvD');
      if (categoryElement) {
        placeDetail.category = await page.evaluate((el: any) => el.textContent, categoryElement) || '';
      }

      // 주소
      const addressElement = await page.$('.PkgBl');
      if (addressElement) {
        placeDetail.address = await page.evaluate((el: any) => el.textContent, addressElement) || '';
      }

      // 전화번호
      const phoneElement = await page.$('.xiLah');
      if (phoneElement) {
        placeDetail.phone = await page.evaluate((el: any) => el.textContent, phoneElement) || '';
      }

      // 영업시간
      const hoursElement = await page.$('.MxgIj');
      if (hoursElement) {
        placeDetail.businessHours = await page.evaluate((el: any) => el.textContent, hoursElement) || '';
      }

      // 탭 목록
      const tabElements = await page.$$('.veBoZ');
      for (const tab of tabElements) {
        const tabText = await page.evaluate((el: any) => el.textContent, tab);
        if (tabText) {
          placeDetail.tabs.push(tabText);
        }
      }

      // 예약/문의 버튼 확인
      const reservationButton = await page.$('[data-nclicks-area-code="btp"]');
      placeDetail.hasReservation = !!reservationButton;
      
      const inquiryButton = await page.$('[data-nclicks-area-code="qna"]');
      placeDetail.hasInquiry = !!inquiryButton;

      // 이미지 개수
      const imageElements = await page.$$('.K0PDV');
      placeDetail.images = new Array(imageElements.length).fill('image');

      // 리뷰 개수
      const visitorReviewElement = await page.$('.dAsGb .YwYLL');
      if (visitorReviewElement) {
        const reviewText = await page.evaluate((el: any) => el.textContent, visitorReviewElement);
        const match = reviewText?.match(/\d+/);
        if (match) {
          placeDetail.visitorReviewCount = parseInt(match[0]);
        }
      }

      // 블로그 리뷰 개수
      const blogReviewElement = await page.$('.ugMJl .YwYLL');
      if (blogReviewElement) {
        const reviewText = await page.evaluate((el: any) => el.textContent, blogReviewElement);
        const match = reviewText?.match(/\d+/);
        if (match) {
          placeDetail.blogReviewCount = parseInt(match[0]);
        }
      }

      // SNS 링크
      const blogLinkElement = await page.$('a[href*="blog.naver.com"]');
      if (blogLinkElement) {
        placeDetail.blogLink = await page.evaluate((el: any) => el.href, blogLinkElement) || '';
      }

      const instagramLinkElement = await page.$('a[href*="instagram.com"]');
      if (instagramLinkElement) {
        placeDetail.instagramLink = await page.evaluate((el: any) => el.href, instagramLinkElement) || '';
      }

      // 소개글
      const introElement = await page.$('.WoYOw');
      if (introElement) {
        placeDetail.introduction = await page.evaluate((el: any) => el.textContent, introElement) || '';
      }

      // 찾아오는길
      const directionsElement = await page.$('.nNPOq');
      if (directionsElement) {
        placeDetail.directions = await page.evaluate((el: any) => el.textContent, directionsElement) || '';
      }

      // 대표 키워드
      const keywordElements = await page.$$('.DUNfc');
      for (const keyword of keywordElements) {
        const keywordText = await page.evaluate((el: any) => el.textContent, keyword);
        if (keywordText) {
          placeDetail.representativeKeywords?.push(keywordText);
        }
      }

      // 스마트콜 확인 (0507 번호)
      if (placeDetail.phone && placeDetail.phone.includes('0507')) {
        placeDetail.hasSmartCall = true;
      }

      // 클립 탭 확인
      placeDetail.hasClipTab = placeDetail.tabs.includes('클립');

      // 쿠폰 확인
      const couponElement = await page.$('[data-nclicks-area-code="cou"]');
      placeDetail.hasCoupon = !!couponElement;

    } catch (error) {
      console.error('Error extracting place info:', error);
    }

    // 기본값 설정
    if (!placeDetail.name) {
      placeDetail.name = `업체 (ID: ${placeId})`;
    }
    if (!placeDetail.category) {
      placeDetail.category = '분류 정보 없음';
    }

    return placeDetail;
  }
}

export const playwrightCrawlerService = new PlaywrightCrawlerService();
```

## 🎨 Frontend 코드

### 1. api.ts - API 서비스
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const smartPlaceAPI = {
  // URL 해석 및 Place ID 추출
  resolveShortUrl: async (url: string) => {
    const response = await api.post('/smartplace/resolve-url', { url });
    return response.data.data;
  },

  // 스마트플레이스 정보 조회
  getSmartPlaceInfo: async (placeId: string) => {
    const response = await api.get(`/smartplace/info/${placeId}`);
    return response.data.data;
  },

  // 스마트플레이스 분석
  analyzeSmartPlace: async (placeId: string) => {
    const response = await api.post('/smartplace/analyze', { placeId });
    return response.data.data;
  }
};
```

### 2. SmartPlaceAnalysis.tsx - 메인 컴포넌트 (전체 코드)
```tsx
// frontend/src/components/SmartPlaceAnalysis.tsx
import React, { useState, useRef } from 'react';
import { 
  Search, Loader2, MapPin, Phone, Clock, Tag, 
  ExternalLink, Instagram, AlertTriangle, 
  CheckCircle, XCircle, Download, Share2 
} from 'lucide-react';
import { smartPlaceAPI } from '../services/api';
import html2canvas from 'html2canvas';
import '../styles/SmartPlaceAnalysis.css';

interface SmartPlaceInfo {
  id: string;
  name: string;
  category: string;
  businessHours?: string;
  phone?: string;
  address?: string;
  hasReservation?: boolean;
  hasInquiry?: boolean;
  hasCoupon?: boolean;
  tabs?: string[];
  description?: string;
  images?: string[];
  amenities?: string[];
  keywords?: string[];
  visitorReviewCount?: number;
  blogReviewCount?: number;
  directions?: string;
  blogLink?: string;
  instagramLink?: string;
  introduction?: string;
  representativeKeywords?: string[];
  educationInfo?: {
    hasRegistrationNumber: boolean;
    hasTuitionFee: boolean;
    registrationNumber?: string;
    tuitionFees?: string[];
  };
  imageRegistrationDates?: string[];
  hasClipTab?: boolean;
  newsUpdateDates?: string[];
  visitorReviews?: Array<{
    date: string;
    hasReply: boolean;
  }>;
  blogReviews?: string[];
  hasSmartCall?: boolean;
  priceDisplay?: {
    hasText: boolean;
    hasImage: boolean;
  };
}

interface AnalysisItem {
  category: string;
  comment: string;
  status: 'good' | 'warning' | 'danger';
}

const SmartPlaceAnalysis: React.FC = () => {
  const [placeId, setPlaceId] = useState('');
  const [placeInfo, setPlaceInfo] = useState<SmartPlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisItem[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const analysisResultRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeId.trim()) {
      setError('Place ID를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setShowAnalysis(false);
    
    try {
      let extractedId = placeId;
      
      // naver.me 단축 URL인 경우 먼저 원본 URL로 변환
      if (placeId.includes('naver.me/')) {
        console.log('Detected shortened URL:', placeId);
        const resolvedData = await smartPlaceAPI.resolveShortUrl(placeId);
        console.log('Resolved URL data:', resolvedData);
        extractedId = resolvedData.placeId;
      } else if (placeId.includes('naver.com')) {
        const match = placeId.match(/place\/(\d+)/);
        if (match) {
          extractedId = match[1];
        }
      }

      const info = await smartPlaceAPI.getSmartPlaceInfo(extractedId);
      setPlaceInfo(info);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || '정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const analyzePlace = () => {
    if (!placeInfo) return;

    const results: AnalysisItem[] = [];

    // 사진 평가
    if (placeInfo.images && placeInfo.images.length > 0) {
      if (placeInfo.images.length >= 10) {
        results.push({
          category: '사진',
          comment: '충분한 사진이 등록되어 있습니다. 고객에게 좋은 인상을 줄 수 있습니다.',
          status: 'good'
        });
      } else if (placeInfo.images.length >= 5) {
        results.push({
          category: '사진',
          comment: `현재 ${placeInfo.images.length}장의 사진이 등록되어 있습니다. 10장 이상 등록을 권장합니다.`,
          status: 'warning'
        });
      } else {
        results.push({
          category: '사진',
          comment: `사진이 ${placeInfo.images.length}장만 등록되어 있습니다. 최소 10장 이상의 다양한 사진을 등록해주세요.`,
          status: 'danger'
        });
      }
    } else {
      results.push({
        category: '사진',
        comment: '등록된 사진이 없습니다. 업체의 모습을 보여줄 수 있는 사진을 등록해주세요.',
        status: 'danger'
      });
    }

    // 소식 평가
    if (placeInfo.tabs && placeInfo.tabs.includes('소식')) {
      results.push({
        category: '소식',
        comment: '소식 탭이 활성화되어 있습니다. 정기적으로 업데이트하여 활용도를 높이세요.',
        status: 'good'
      });
    } else {
      results.push({
        category: '소식',
        comment: '소식 탭이 비활성화되어 있습니다. 이벤트나 공지사항을 알릴 수 있는 소식 기능을 활용해보세요.',
        status: 'warning'
      });
    }

    // 찾아오는길 평가
    if (placeInfo.directions) {
      results.push({
        category: '찾아오는길',
        comment: '찾아오는길 정보가 등록되어 있습니다. 대중교통 및 주차 정보가 포함되어 있는지 확인하세요.',
        status: 'good'
      });
    } else {
      results.push({
        category: '찾아오는길',
        comment: '찾아오는길 정보가 없습니다. 상세한 오시는 길 안내를 추가해주세요.',
        status: 'danger'
      });
    }

    // 가격 평가
    if (placeInfo.tabs && placeInfo.tabs.includes('메뉴')) {
      results.push({
        category: '가격',
        comment: '메뉴/가격 정보가 등록되어 있습니다. 최신 정보로 유지하는 것이 중요합니다.',
        status: 'good'
      });
    } else if (placeInfo.priceDisplay?.hasText || placeInfo.priceDisplay?.hasImage) {
      results.push({
        category: '가격',
        comment: '가격 정보가 일부 등록되어 있습니다. 메뉴 탭을 추가하여 더 체계적으로 관리하세요.',
        status: 'warning'
      });
    } else {
      results.push({
        category: '가격',
        comment: '메뉴나 가격 정보가 없습니다. 고객이 미리 확인할 수 있도록 등록해주세요.',
        status: 'danger'
      });
    }

    // SNS 평가
    if (placeInfo.blogLink && placeInfo.instagramLink) {
      results.push({
        category: 'SNS',
        comment: '블로그와 인스타그램이 모두 연결되어 있습니다. 훌륭합니다!',
        status: 'good'
      });
    } else if (placeInfo.blogLink || placeInfo.instagramLink) {
      results.push({
        category: 'SNS',
        comment: `${placeInfo.blogLink ? '블로그' : '인스타그램'}만 연결되어 있습니다. 다양한 SNS 채널을 활용해보세요.`,
        status: 'warning'
      });
    } else {
      results.push({
        category: 'SNS',
        comment: 'SNS가 연결되어 있지 않습니다. 블로그나 인스타그램을 연결하여 온라인 마케팅을 강화하세요.',
        status: 'danger'
      });
    }

    // 리뷰 평가
    const totalReviews = (placeInfo.visitorReviewCount || 0) + (placeInfo.blogReviewCount || 0);
    if (totalReviews >= 100) {
      results.push({
        category: '리뷰',
        comment: `총 ${totalReviews}개의 리뷰가 있습니다. 활발한 리뷰 활동이 이루어지고 있습니다.`,
        status: 'good'
      });
    } else if (totalReviews >= 50) {
      results.push({
        category: '리뷰',
        comment: `총 ${totalReviews}개의 리뷰가 있습니다. 더 많은 리뷰를 유도하면 신뢰도가 높아집니다.`,
        status: 'warning'
      });
    } else {
      results.push({
        category: '리뷰',
        comment: `리뷰가 ${totalReviews}개뿐입니다. 적극적인 리뷰 요청으로 신뢰도를 높이세요.`,
        status: 'danger'
      });
    }

    // 네이버 기능 활용
    const naverFeatures = [];
    if (placeInfo.hasReservation) naverFeatures.push('예약');
    if (placeInfo.hasInquiry) naverFeatures.push('문의');
    if (placeInfo.hasCoupon) naverFeatures.push('쿠폰');
    if (placeInfo.hasSmartCall) naverFeatures.push('스마트콜');
    if (placeInfo.representativeKeywords && placeInfo.representativeKeywords.length > 0) naverFeatures.push('대표키워드');

    if (naverFeatures.length >= 3) {
      results.push({
        category: '네이버 기능 활용',
        comment: `${naverFeatures.join(', ')} 기능을 활용 중입니다. 네이버 기능을 잘 활용하고 있습니다.`,
        status: 'good'
      });
    } else if (naverFeatures.length >= 1) {
      results.push({
        category: '네이버 기능 활용',
        comment: `${naverFeatures.join(', ')} 기능만 활용 중입니다. 더 많은 기능을 활용해보세요.`,
        status: 'warning'
      });
    } else {
      results.push({
        category: '네이버 기능 활용',
        comment: '네이버 제공 기능을 거의 활용하지 않고 있습니다. 예약, 문의, 대표키워드 등을 설정하세요.',
        status: 'danger'
      });
    }

    // 정보 평가
    const hasBasicInfo = placeInfo.phone && placeInfo.address && placeInfo.businessHours;
    if (hasBasicInfo && placeInfo.introduction) {
      results.push({
        category: '정보',
        comment: '기본 정보와 소개글이 모두 작성되어 있습니다. 정보가 충실합니다.',
        status: 'good'
      });
    } else if (hasBasicInfo) {
      results.push({
        category: '정보',
        comment: '기본 정보는 있지만 소개글이 부족합니다. 업체를 소개하는 매력적인 소개글을 작성하세요.',
        status: 'warning'
      });
    } else {
      results.push({
        category: '정보',
        comment: '전화번호, 주소, 영업시간 등 기본 정보가 누락되어 있습니다. 반드시 등록해주세요.',
        status: 'danger'
      });
    }

    // 교육청 심의 준수 여부 (학원 카테고리인 경우)
    if (placeInfo.category && placeInfo.category.includes('학원')) {
      if (placeInfo.educationInfo?.hasRegistrationNumber && placeInfo.educationInfo?.hasTuitionFee) {
        results.push({
          category: '교육청 심의 준수',
          comment: '학원 등록번호와 교습비가 모두 표시되어 있습니다. 교육청 심의 기준을 준수하고 있습니다.',
          status: 'good'
        });
      } else if (placeInfo.educationInfo?.hasRegistrationNumber || placeInfo.educationInfo?.hasTuitionFee) {
        results.push({
          category: '교육청 심의 준수',
          comment: '교육청 심의 항목이 일부만 표시되어 있습니다. 누락된 정보를 추가하세요.',
          status: 'warning'
        });
      } else {
        results.push({
          category: '교육청 심의 준수',
          comment: '학원 등록증, 교습비 등 교육청 심의 필수 항목을 게시해주세요.',
          status: 'danger'
        });
      }
    }

    setAnalysisResults(results);
    setShowAnalysis(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="status-icon good" size={20} />;
      case 'warning':
        return <AlertTriangle className="status-icon warning" size={20} />;
      case 'danger':
        return <XCircle className="status-icon danger" size={20} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good':
        return '양호';
      case 'warning':
        return '주의';
      case 'danger':
        return '경고';
      default:
        return '';
    }
  };

  const generateAnalysisImage = async () => {
    if (!analysisResultRef.current || !placeInfo) return;
    
    setIsGeneratingImage(true);
    
    try {
      const canvas = await html2canvas(analysisResultRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imageUrl = canvas.toDataURL('image/png');
      return imageUrl;
    } catch (error) {
      console.error('이미지 생성 실패:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    const imageUrl = await generateAnalysisImage();
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.download = `스마트플레이스_분석결과_${placeInfo?.name}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = imageUrl;
    link.click();
  };

  const handleShareImage = async () => {
    const imageUrl = await generateAnalysisImage();
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `스마트플레이스_분석결과_${placeInfo?.name}.png`, { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          title: '스마트플레이스 분석 결과',
          text: `${placeInfo?.name}의 스마트플레이스 분석 결과입니다.`,
          files: [file]
        });
      } else {
        // PC에서는 클립보드에 복사
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        alert('이미지가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  return (
    <div className="smartplace-analysis-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Loader2 className="loading-spinner" size={48} />
            <div className="loading-text">스마트플레이스 분석 중...</div>
          </div>
        </div>
      )}
      
      <h1 className="page-title">스마트플레이스 분석</h1>
      <p className="page-subtitle">네이버 스마트플레이스를 종합적으로 분석하고 개선점을 제안합니다</p>

      <div className="content-card">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-group">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="Place ID 또는 네이버 플레이스 URL을 입력하세요"
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : '분석하기'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </form>

        {placeInfo && (
          <>
            <div className="place-info-card">
              <div className="info-header">
                <h2>{placeInfo.name}</h2>
                <span className="category-badge">{placeInfo.category}</span>
              </div>

              <div className="info-grid">
                {placeInfo.address && (
                  <div className="info-item">
                    <MapPin size={18} />
                    <div>
                      <span className="info-label">주소</span>
                      <span>{placeInfo.address}</span>
                    </div>
                  </div>
                )}
                
                {placeInfo.phone && (
                  <div className="info-item">
                    <Phone size={18} />
                    <div>
                      <span className="info-label">전화번호</span>
                      <span>{placeInfo.phone}</span>
                    </div>
                  </div>
                )}
                
                {placeInfo.businessHours && (
                  <div className="info-item">
                    <Clock size={18} />
                    <div>
                      <span className="info-label">운영시간</span>
                      <span>{placeInfo.businessHours}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="features-grid">
                <div className="feature-card">
                  <h3>예약 기능</h3>
                  <p className={placeInfo.hasReservation ? 'enabled' : 'disabled'}>
                    {placeInfo.hasReservation ? 'O' : 'X'}
                  </p>
                </div>
                
                <div className="feature-card">
                  <h3>문의 기능</h3>
                  <p className={placeInfo.hasInquiry ? 'enabled' : 'disabled'}>
                    {placeInfo.hasInquiry ? 'O' : 'X'}
                  </p>
                </div>
                
                <div className="feature-card">
                  <h3>쿠폰 기능</h3>
                  <p className={placeInfo.hasCoupon ? 'enabled' : 'disabled'}>
                    {placeInfo.hasCoupon ? 'O' : 'X'}
                  </p>
                </div>
              </div>

              <button onClick={analyzePlace} className="analyze-button">
                상세 분석 시작
              </button>
            </div>

            {showAnalysis && (
              <div className="analysis-results" ref={analysisResultRef}>
                <div className="analysis-header">
                  <h2>상세 분석 결과</h2>
                  <div className="analysis-actions">
                    <button onClick={handleDownloadImage} className="action-button">
                      <Download size={18} />
                      이미지 다운로드
                    </button>
                    <button onClick={handleShareImage} className="action-button">
                      <Share2 size={18} />
                      공유하기
                    </button>
                  </div>
                </div>

                <div className="analysis-table">
                  <div className="table-header">
                    <div className="header-cell">평가항목</div>
                    <div className="header-cell">코멘트</div>
                    <div className="header-cell">세부판단</div>
                  </div>
                  {analysisResults.map((result, index) => (
                    <div key={index} className={`table-row ${result.status}`}>
                      <div className="cell category-cell">
                        {result.category}
                      </div>
                      <div className="cell comment-cell">
                        {result.comment}
                      </div>
                      <div className="cell status-cell">
                        {getStatusIcon(result.status)}
                        <span className={`status-text ${result.status}`}>
                          {getStatusText(result.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="summary-section">
                  <h3>종합 평가</h3>
                  <div className="summary-stats">
                    <div className="stat-item good">
                      <CheckCircle size={24} />
                      <span className="stat-label">양호</span>
                      <span className="stat-count">
                        {analysisResults.filter(r => r.status === 'good').length}개
                      </span>
                    </div>
                    <div className="stat-item warning">
                      <AlertTriangle size={24} />
                      <span className="stat-label">주의</span>
                      <span className="stat-count">
                        {analysisResults.filter(r => r.status === 'warning').length}개
                      </span>
                    </div>
                    <div className="stat-item danger">
                      <XCircle size={24} />
                      <span className="stat-label">경고</span>
                      <span className="stat-count">
                        {analysisResults.filter(r => r.status === 'danger').length}개
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SmartPlaceAnalysis;
```

### 3. SmartPlaceAnalysis.css - 스타일시트 (전체)
```css
/* frontend/src/styles/SmartPlaceAnalysis.css */

.smartplace-analysis-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.25rem;
  margin-top: 1rem;
  font-weight: 600;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.page-subtitle {
  font-size: 1rem;
  color: #666;
  margin-bottom: 2rem;
}

.content-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.search-form {
  margin-bottom: 2rem;
}

.search-input-group {
  display: flex;
  align-items: center;
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.search-icon {
  color: #999;
  margin-right: 0.75rem;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 1rem;
}

.search-button {
  background: #4A90E2;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.search-button:hover:not(:disabled) {
  background: #357ABD;
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.place-info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.info-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.category-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-item svg {
  color: #666;
}

.info-label {
  display: block;
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 0.25rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.feature-card h3 {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.feature-card p {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.feature-card p.enabled {
  color: #4caf50;
}

.feature-card p.disabled {
  color: #f44336;
}

.analyze-button {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.analyze-button:hover {
  transform: translateY(-2px);
}

.analysis-results {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-top: 2rem;
  border: 1px solid #e0e0e0;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.analysis-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.analysis-actions {
  display: flex;
  gap: 1rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.3s;
}

.action-button:hover {
  background: #e0e0e0;
}

.analysis-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 150px 1fr 120px;
  background: #f5f5f5;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
}

.header-cell {
  padding: 1rem;
  border-right: 1px solid #e0e0e0;
}

.header-cell:last-child {
  border-right: none;
}

.table-row {
  display: grid;
  grid-template-columns: 150px 1fr 120px;
  border-bottom: 1px solid #e0e0e0;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.good {
  background: #f1f8e9;
}

.table-row.warning {
  background: #fff8e1;
}

.table-row.danger {
  background: #ffebee;
}

.cell {
  padding: 1rem;
  border-right: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
}

.cell:last-child {
  border-right: none;
}

.category-cell {
  font-weight: 600;
  color: #333;
}

.comment-cell {
  color: #555;
  line-height: 1.5;
}

.status-cell {
  justify-content: center;
  gap: 0.5rem;
}

.status-icon.good {
  color: #4caf50;
}

.status-icon.warning {
  color: #ff9800;
}

.status-icon.danger {
  color: #f44336;
}

.status-text {
  font-weight: 600;
}

.status-text.good {
  color: #4caf50;
}

.status-text.warning {
  color: #ff9800;
}

.status-text.danger {
  color: #f44336;
}

.summary-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e0e0e0;
}

.summary-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.summary-stats {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-item.good {
  color: #4caf50;
}

.stat-item.warning {
  color: #ff9800;
}

.stat-item.danger {
  color: #f44336;
}

.stat-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-count {
  font-size: 1.5rem;
  font-weight: 700;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .smartplace-analysis-container {
    padding: 1rem;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .header-cell,
  .cell {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .summary-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .analysis-header {
    flex-direction: column;
    gap: 1rem;
  }

  .analysis-actions {
    width: 100%;
  }

  .action-button {
    flex: 1;
    justify-content: center;
  }
}
```

## 📝 환경 설정 파일

### Backend tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Backend package.json
```json
{
  "name": "smartplace-backend",
  "version": "1.0.0",
  "description": "SmartPlace Analysis Backend",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.1"
  }
}
```

## 🚀 실행 방법

### 1. Backend 실행
```bash
cd backend
npm install
npm run dev
# 서버가 http://localhost:3010 에서 실행됩니다
```

### 2. Frontend 실행
```bash
cd frontend
npm install
npm start
# 앱이 http://localhost:3000 에서 실행됩니다
```

## 📌 사용 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. 네이버 플레이스 URL 또는 Place ID 입력
   - 예: `https://map.naver.com/p/entry/place/1234567890`
   - 예: `https://naver.me/abcdefgh`
   - 예: `1234567890`
3. "분석하기" 버튼 클릭
4. 분석 결과 확인
5. 필요시 이미지로 다운로드 또는 공유

## 🔍 주요 분석 항목

1. **사진**: 10장 이상 권장
2. **소식**: 정기적인 업데이트 권장
3. **찾아오는길**: 상세한 안내 필요
4. **가격**: 메뉴/가격 정보 등록
5. **SNS**: 블로그, 인스타그램 연결
6. **리뷰**: 100개 이상 권장
7. **네이버 기능**: 예약, 문의, 쿠폰 등
8. **정보**: 기본 정보 및 소개글
9. **교육청 심의**: 학원의 경우 필수

## ⚠️ 주의사항

- Playwright가 Chromium 브라우저를 자동으로 다운로드합니다 (약 100MB)
- 네이버 맵의 DOM 구조가 변경되면 크롤링 로직 수정이 필요할 수 있습니다
- 대량의 요청 시 네이버에서 차단될 수 있으니 적절한 딜레이를 추가하세요

## 📄 라이센스

이 코드는 교육 및 연구 목적으로 제공됩니다.
상업적 사용 시 네이버 서비스 이용약관을 확인하세요.