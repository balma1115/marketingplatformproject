import { prisma } from '@/lib/db';
import NaverAdsAPI from './naver-ads-api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface AdsDataRefreshResult {
  userId: number;
  success: boolean;
  dataCount?: number;
  error?: string;
}

interface DailyAdData {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  avgCpc: number;
  avgRnk: number;
  ctr: number;
  conversions?: number;
  conversionRate?: number;
  campaigns?: any[];
  adGroups?: any[];
  keywords?: any[];
}

interface UserAdData {
  userId: number;
  period: {
    start: string;
    end: string;
  };
  dailyData: DailyAdData[];
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalCost: number;
    avgCpc: number;
    avgCtr: number;
    avgRnk: number;
  };
  lastUpdated: Date;
}

export class AdsDataRefreshService {
  private naverAdsApi: NaverAdsAPI | null = null;

  constructor() {
    // API는 사용자별로 인스턴스 생성
  }

  /**
   * 모든 사용자의 광고 데이터를 새로고침 (API 키가 있는 사용자만)
   */
  async refreshAllUsersAdsData(): Promise<AdsDataRefreshResult[]> {
    const results: AdsDataRefreshResult[] = [];

    try {
      // 네이버 광고 계정이 있고 API 키가 등록된 사용자만 조회
      const usersWithAds = await prisma.user.findMany({
        where: {
          isActive: true,
          naverAdsCustomerId: { not: null },
          naverAdsAccessKey: { not: null },
          naverAdsSecretKey: { not: null }
        }
      });

      console.log(`[AdsDataRefresh] Found ${usersWithAds.length} users with active ad accounts and API credentials`);

      // 각 사용자의 데이터 새로고침
      for (const user of usersWithAds) {
        const result = await this.refreshUserAdsData(user.id);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('[AdsDataRefresh] Error refreshing all users:', error);
      throw error;
    }
  }

  /**
   * 특정 사용자의 광고 데이터를 새로고침 (최근 90일)
   */
  async refreshUserAdsData(userId: number): Promise<AdsDataRefreshResult> {
    try {
      console.log(`[AdsDataRefresh] Starting refresh for user ${userId}`);

      // 사용자의 네이버 광고 계정 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.naverAdsCustomerId) {
        return {
          userId,
          success: false,
          error: 'No Naver ad account found'
        };
      }
      
      // API 키 재확인
      if (!user.naverAdsAccessKey || !user.naverAdsSecretKey) {
        return {
          userId,
          success: false,
          error: 'API credentials not found'
        };
      }
      
      // API 클라이언트 생성
      this.naverAdsApi = new NaverAdsAPI({
        customerId: user.naverAdsCustomerId,
        accessKey: user.naverAdsAccessKey,
        secretKey: user.naverAdsSecretKey
      });

      // 최근 90일 기간 설정 (어제부터 90일 전까지)
      const today = new Date();
      const yesterday = subDays(today, 1); // 어제
      const startDate = subDays(yesterday, 89); // 어제부터 90일 전

      const dailyData: DailyAdData[] = [];

      // 일별로 데이터 수집 (어제부터 90일 전까지)
      for (let i = 0; i < 90; i++) {
        const targetDate = subDays(yesterday, i);
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        
        try {
          // StatReport API를 통해 일별 데이터 조회
          const dayData = await this.fetchDailyAdData(user.naverAdsCustomerId, dateStr);
          if (dayData) {
            dailyData.push(dayData);
          }
        } catch (error) {
          console.error(`[AdsDataRefresh] Error fetching data for ${dateStr}:`, error);
        }
      }

      // 요약 통계 계산
      const summary = this.calculateSummary(dailyData);

      // UserAdData 객체 생성
      const userAdData: UserAdData = {
        userId,
        period: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(yesterday, 'yyyy-MM-dd')
        },
        dailyData: dailyData.sort((a, b) => a.date.localeCompare(b.date)),
        summary,
        lastUpdated: new Date()
      };

      // 기존 데이터 삭제 후 새 데이터 저장
      await prisma.naverAdsData.deleteMany({
        where: { userId }
      });

      await prisma.naverAdsData.create({
        data: {
          userId,
          dataType: 'DAILY_STATS_90',
          data: JSON.stringify(userAdData),
          lastUpdated: new Date()
        }
      });

      console.log(`[AdsDataRefresh] Successfully refreshed data for user ${userId}: ${dailyData.length} days`);

      return {
        userId,
        success: true,
        dataCount: dailyData.length
      };

    } catch (error) {
      console.error(`[AdsDataRefresh] Error refreshing user ${userId}:`, error);
      return {
        userId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 특정 날짜의 광고 데이터 조회
   */
  private async fetchDailyAdData(customerId: string, date: string): Promise<DailyAdData | null> {
    try {
      if (!this.naverAdsApi) {
        throw new Error('Naver Ads API client not initialized');
      }
      
      // getCampaignStats 메서드를 사용하여 일별 데이터 조회
      // 이 메서드는 /stats 엔드포인트를 사용하며 정상 작동함
      const response = await this.naverAdsApi.getCampaignStats(
        undefined,  // 모든 캠페인 대상
        date,       // 시작일
        date        // 종료일 (같은 날짜로 설정하여 하루만)
      );

      if (!response) {
        return null;
      }

      // getCampaignStats는 단일 객체를 반환함 (이미 모든 캠페인 합산된 데이터)
      const dayStats = response;
      
      return {
        date,
        impressions: dayStats.impCnt || 0,
        clicks: dayStats.clkCnt || 0,
        cost: dayStats.salesAmt || 0,
        avgCpc: dayStats.cpc || 0,
        avgRnk: dayStats.avgRnk || 0,
        ctr: dayStats.ctr || 0,
        conversions: dayStats.ccnt || 0,
        conversionRate: (dayStats as any).convRs || 0
      };

    } catch (error) {
      console.error(`[AdsDataRefresh] Error fetching data for ${date}:`, error);
      return null;
    }
  }

  /**
   * 요약 통계 계산
   */
  private calculateSummary(dailyData: DailyAdData[]) {
    const totalImpressions = dailyData.reduce((sum, d) => sum + d.impressions, 0);
    const totalClicks = dailyData.reduce((sum, d) => sum + d.clicks, 0);
    const totalCost = dailyData.reduce((sum, d) => sum + d.cost, 0);
    
    return {
      totalImpressions,
      totalClicks,
      totalCost,
      avgCpc: totalClicks > 0 ? totalCost / totalClicks : 0,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgRnk: dailyData.length > 0 
        ? dailyData.reduce((sum, d) => sum + d.avgRnk, 0) / dailyData.length 
        : 0
    };
  }

  /**
   * 사용자의 저장된 광고 데이터 조회
   */
  async getUserAdsData(userId: number): Promise<UserAdData | null> {
    try {
      const savedData = await prisma.naverAdsData.findFirst({
        where: {
          userId,
          dataType: 'DAILY_STATS_90'
        },
        orderBy: { lastUpdated: 'desc' }
      });

      if (!savedData) {
        return null;
      }

      return JSON.parse(savedData.data as string) as UserAdData;
    } catch (error) {
      console.error(`[AdsDataRefresh] Error getting user data for ${userId}:`, error);
      return null;
    }
  }

  /**
   * 오래된 데이터 정리 (90일 이상 된 데이터 삭제)
   */
  async cleanupOldData(): Promise<number> {
    try {
      const cutoffDate = subDays(new Date(), 90);
      
      // 각 사용자의 데이터 업데이트
      const allData = await prisma.naverAdsData.findMany({
        where: {
          dataType: 'DAILY_STATS_90'
        }
      });

      let cleanedCount = 0;

      for (const record of allData) {
        const data = JSON.parse(record.data as string) as UserAdData;
        
        // 90일 이상 된 데이터 필터링
        const filteredDailyData = data.dailyData.filter(d => {
          const dataDate = new Date(d.date);
          return dataDate >= cutoffDate;
        });

        // 데이터가 변경된 경우에만 업데이트
        if (filteredDailyData.length !== data.dailyData.length) {
          data.dailyData = filteredDailyData;
          data.summary = this.calculateSummary(filteredDailyData);
          data.lastUpdated = new Date();

          await prisma.naverAdsData.update({
            where: { id: record.id },
            data: {
              data: JSON.stringify(data),
              lastUpdated: new Date()
            }
          });

          cleanedCount++;
        }
      }

      console.log(`[AdsDataRefresh] Cleaned up old data for ${cleanedCount} users`);
      return cleanedCount;
    } catch (error) {
      console.error('[AdsDataRefresh] Error cleaning up old data:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const adsDataRefreshService = new AdsDataRefreshService();