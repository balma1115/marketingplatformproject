// Simplified tracking service without BullMQ for older Redis versions
import { prisma } from '@/lib/db';
import { ImprovedNaverScraperV3 } from './improved-scraper-v3';
import { getNaverBlogScraperV2, closeNaverBlogScraperV2 } from './naver-blog-scraper-v2';
import { trackingManager } from './tracking-manager';
import { adsDataRefreshService } from './ads-data-refresh-service';
// SSE event emitter will be imported dynamically to avoid circular dependency

interface TrackingResult {
  success: boolean;
  userId: string;
  userName: string;
  type: 'smartplace' | 'blog' | 'ads';
  resultsCount?: number;
  error?: string;
}

// Simple in-memory queue status tracking
let trackingStatus = {
  smartplace: {
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0
  },
  blog: {
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0
  }
};

// Track SmartPlace rankings for a user
export async function trackSmartPlaceForUser(userId: string | number, userName: string, jobId?: string): Promise<TrackingResult> {
  trackingStatus.smartplace.active++;
  
  // 작업 상태 업데이트 - 실행 중
  if (jobId) {
    trackingManager.updateJob(jobId, {
      status: 'running',
      startedAt: new Date()
    });
  }
  
  try {
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
    
    // Get user's smartplace data
    const smartPlace = await prisma.smartPlace.findFirst({
      where: { userId: userIdInt }
    });

    if (!smartPlace) {
      trackingStatus.smartplace.active--;
      trackingStatus.smartplace.failed++;
      
      // 작업 상태 업데이트 - 실패
      if (jobId) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: {
            message: '스마트플레이스가 등록되지 않음',
            timestamp: new Date()
          }
        });
      }
      
      return { 
        success: false, 
        userId, 
        userName, 
        type: 'smartplace',
        error: 'No SmartPlace registered' 
      };
    }

    // Get active keywords
    const keywords = await prisma.smartPlaceKeyword.findMany({
      where: {
        smartPlaceId: smartPlace.id,
        isActive: true
      }
    });

    if (keywords.length === 0) {
      trackingStatus.smartplace.active--;
      trackingStatus.smartplace.completed++;
      
      // 키워드가 0개여도 성공으로 처리
      if (jobId) {
        trackingManager.updateJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
          results: {
            successCount: 0,
            failedCount: 0,
            message: '추적할 키워드가 없음'
          }
        });
      }
      
      return { 
        success: true,  // false -> true로 변경
        userId, 
        userName, 
        type: 'smartplace',
        resultsCount: 0  // error 대신 resultsCount 0
      };
    }

    // Update job with total keywords count
    if (jobId) {
      trackingManager.updateJob(jobId, {
        progress: { current: 0, total: keywords.length }
      });
    }
    
    // Initialize scraper
    const scraper = new ImprovedNaverScraperV3();
    
    // Track keywords one by one for progress updates
    const results: any[] = [];
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    for (const keyword of keywords) {
      try {
        // Update progress before tracking
        if (jobId) {
          trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
        }
        
        console.log(`[SmartPlace] Tracking keyword ${processedCount + 1}/${keywords.length}: ${keyword.keyword}`);
        
        // Track single keyword
        const result = await scraper.trackRanking(keyword.keyword, {
          placeId: smartPlace.placeId,
          placeName: smartPlace.placeName
        });
        
        // Save result to database
        await prisma.smartPlaceRanking.create({
          data: {
            keywordId: keyword.id,
            checkDate: new Date(),
            organicRank: result.organicRank,
            adRank: result.adRank,
            totalResults: result.totalResults || 0,
            topTenPlaces: result.topTenPlaces || null
          }
        });

        // Update keyword's last checked date
        await prisma.smartPlaceKeyword.update({
          where: { id: keyword.id },
          data: { lastChecked: new Date() }
        });
        
        processedCount++;
        successCount++;
        
        // Update progress after tracking
        if (jobId) {
          trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
        }
        
        results.push({
          keywordId: keyword.id,
          ...result
        });
        
      } catch (error) {
        console.error(`[SmartPlace] Error tracking keyword "${keyword.keyword}":`, error);
        processedCount++;
        failedCount++;
        
        // Update progress even on error
        if (jobId) {
          trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
        }
      }
    }
    
    // Close scraper after all keywords are done
    await scraper.close();

    // Update SmartPlace last updated
    await prisma.smartPlace.update({
      where: { id: smartPlace.id },
      data: { lastUpdated: new Date() }
    });

    trackingStatus.smartplace.active--;
    trackingStatus.smartplace.completed++;
    
    // 작업 상태 업데이트 - 완료
    if (jobId) {
      trackingManager.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          successCount: successCount,
          failedCount: failedCount
        }
      });
    }
    
    return { 
      success: true, 
      userId, 
      userName, 
      type: 'smartplace',
      resultsCount: successCount 
    };

  } catch (error) {
    console.error(`[SmartPlace] Error tracking for user ${userName}:`, error);
    trackingStatus.smartplace.active--;
    trackingStatus.smartplace.failed++;
    
    // 작업 상태 업데이트 - 실패
    if (jobId) {
      trackingManager.updateJob(jobId, {
        status: 'failed',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      });
    }
    
    return { 
      success: false, 
      userId, 
      userName, 
      type: 'smartplace',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Track Blog rankings for a user
export async function trackBlogForUser(userId: string | number, userName: string, jobId?: string): Promise<TrackingResult> {
  trackingStatus.blog.active++;
  
  // 작업 상태 업데이트 - 실행 중
  if (jobId) {
    trackingManager.updateJob(jobId, {
      status: 'running',
      startedAt: new Date()
    });
  }
  
  try {
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
    
    // Get user's blog data (BlogTrackingProject 또는 BlogProject)
    // 키워드가 있는 프로젝트를 우선 선택
    const blogTrackingProjects = await prisma.blogTrackingProject.findMany({
      where: { userId: userIdInt },
      include: {
        keywords: {
          where: { isActive: true }
        }
      }
    });

    let blog = blogTrackingProjects.find(p => p.keywords.length > 0) || blogTrackingProjects[0];

    // BlogTrackingProject가 없으면 BlogProject 확인
    let isBlogProject = false;
    if (!blog) {
      const blogProjects = await prisma.blogProject.findMany({
        where: { userId: userIdInt },
        include: {
          keywords: {
            where: { isActive: true }
          }
        }
      });
      const blogProjectData = blogProjects.find(p => p.keywords.length > 0) || blogProjects[0];
      if (blogProjectData) {
        blog = blogProjectData as any;
        isBlogProject = true;
      }
    }

    if (!blog) {
      trackingStatus.blog.active--;
      trackingStatus.blog.failed++;
      
      // 작업 상태 업데이트 - 실패
      if (jobId) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: {
            message: '블로그 프로젝트가 등록되지 않음',
            timestamp: new Date()
          }
        });
      }
      
      return { 
        success: false, 
        userId, 
        userName, 
        type: 'blog',
        error: 'No blog project' 
      };
    }

    // Get active keywords (BlogTrackingKeyword 또는 BlogKeyword)
    let keywords: any[] = [];
    
    if (isBlogProject) {
      keywords = await prisma.blogKeyword.findMany({
        where: {
          projectId: blog.id,
          isActive: true
        }
      });
    } else {
      keywords = await prisma.blogTrackingKeyword.findMany({
        where: {
          projectId: blog.id,
          isActive: true
        }
      });
    }

    if (keywords.length === 0) {
      trackingStatus.blog.active--;
      trackingStatus.blog.completed++;
      
      // 키워드가 0개여도 성공으로 처리
      if (jobId) {
        trackingManager.updateJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
          results: {
            successCount: 0,
            failedCount: 0,
            message: '추적할 키워드가 없음'
          }
        });
      }
      
      return { 
        success: true,  // false -> true로 변경
        userId, 
        userName, 
        type: 'blog',
        resultsCount: 0  // error 대신 resultsCount 0
      };
    }

    // Update job with total keywords count
    if (jobId) {
      trackingManager.updateProgress(jobId, 0, keywords.length);
    }
    
    // Initialize scraper using singleton pattern
    const scraper = await getNaverBlogScraperV2();
    let successCount = 0;
    let processedCount = 0;
    
    // Track all keywords
    for (const keyword of keywords) {
      // Update progress before tracking
      if (jobId) {
        trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
      }
      
      processedCount++;
      try {
        const result = await scraper.checkBlogRanking(
          blog.blogUrl || '',
          keyword.keyword
        );

        // Save ranking result to appropriate table
        if (isBlogProject) {
          // BlogProject uses BlogRanking table
          await prisma.blogRanking.create({
            data: {
              keywordId: keyword.id,
              mainTabExposed: result.mainTabExposed,
              mainTabRank: result.mainTabRank,
              blogTabRank: result.blogTabRank,
              viewTabRank: result.viewTabRank,
              adRank: result.adRank,
              trackingDate: new Date(),
              found: result.found || false,
              url: result.url || null
            }
          });
        } else {
          // BlogTrackingProject uses BlogTrackingResult table
          await prisma.blogTrackingResult.create({
            data: {
              keywordId: keyword.id,
              mainTabExposed: result.mainTabExposed,
              mainTabRank: result.mainTabRank,
              blogTabRank: result.blogTabRank,
              viewTabRank: result.viewTabRank,
              adRank: result.adRank,
              trackingDate: new Date()
            }
          });
        }

        // Update keyword's last checked date for BlogKeyword only
        if (isBlogProject) {
          await prisma.blogKeyword.update({
            where: { id: keyword.id },
            data: { lastChecked: new Date() }
          });
        }
        // BlogTrackingKeyword doesn't have lastCheckedAt field
        
        successCount++;
        
        // Update progress after successful tracking
        if (jobId) {
          trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
        }

      } catch (error) {
        console.error(`[Blog] Error tracking keyword "${keyword.keyword}":`, error);
        
        // Update progress even on error
        if (jobId) {
          trackingManager.updateProgress(jobId, processedCount, keywords.length, keyword.keyword);
        }
      }
    }

    // Update blog project last updated
    // BlogTrackingProject와 BlogProject 모두 처리
    if (isBlogProject) {
      await prisma.blogProject.update({
        where: { id: blog.id },
        data: { lastUpdated: new Date() }  // BlogProject는 lastUpdated 필드 사용
      });
    } else {
      await prisma.blogTrackingProject.update({
        where: { id: blog.id },
        data: { lastTrackedAt: new Date() }  // BlogTrackingProject는 lastTrackedAt 필드 사용
      });
    }

    // Close the scraper using singleton cleanup
    await closeNaverBlogScraperV2();

    trackingStatus.blog.active--;
    trackingStatus.blog.completed++;
    
    // 작업 상태 업데이트 - 완료
    if (jobId) {
      trackingManager.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          successCount,
          failedCount: keywords.length - successCount
        }
      });
    }
    
    return { 
      success: true, 
      userId, 
      userName, 
      type: 'blog',
      resultsCount: successCount 
    };

  } catch (error) {
    console.error(`[Blog] Error tracking for user ${userName}:`, error);
    trackingStatus.blog.active--;
    trackingStatus.blog.failed++;
    
    // 작업 상태 업데이트 - 실패
    if (jobId) {
      trackingManager.updateJob(jobId, {
        status: 'failed',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      });
    }
    
    return { 
      success: false, 
      userId, 
      userName, 
      type: 'blog',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Track all users
export async function trackAllUsers(type: 'all' | 'smartplace' | 'blog' = 'all'): Promise<{ success: number; failed: number; results: TrackingResult[] }> {
  // 기존 활성 작업 모두 취소
  trackingManager.cancelAllActiveJobs();
  console.log(`[Tracking] Cancelled all existing active jobs`);
  
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['user', 'academy', 'branch'] },  // admin과 agency는 제외
      isActive: true
    },
    include: {
      smartPlace: true,
      blogTrackingProjects: true,
      blogProjects: true
    }
  });

  // 1단계: 모든 작업을 큐에 등록
  const jobs: { userId: string; userName: string; type: 'smartplace' | 'blog'; jobId: string }[] = [];
  const adsJobs: { userId: number; userName: string }[] = [];
  
  console.log(`[Tracking] Registering jobs for ${users.length} users (type: ${type})...`);
  
  for (const user of users) {
    // SmartPlace가 등록된 경우 큐에 추가
    if (user.smartPlace && (type === 'all' || type === 'smartplace')) {
      const smartplaceJobId = trackingManager.addJob({
        userId: user.id.toString(),
        userName: user.name,
        userEmail: user.email,
        type: 'smartplace',
        status: 'queued',
        progress: { current: 0, total: 0 }
      });
      
      // 중복 체크로 인해 기존 ID가 반환될 수 있음
      if (!jobs.find(j => j.jobId === smartplaceJobId)) {
        jobs.push({
          userId: user.id.toString(),
          userName: user.name,
          type: 'smartplace',
          jobId: smartplaceJobId
        });
        
        console.log(`[Queue] Added SmartPlace job for ${user.name} (${smartplaceJobId})`);
      }
    }

    // Blog가 등록된 경우 큐에 추가 (BlogTrackingProject 또는 BlogProject)
    const hasBlog = (user.blogTrackingProjects && user.blogTrackingProjects.length > 0) || 
                    (user.blogProjects && user.blogProjects.length > 0);
    
    if (hasBlog && (type === 'all' || type === 'blog')) {
      const blogJobId = trackingManager.addJob({
        userId: user.id.toString(),
        userName: user.name,
        userEmail: user.email,
        type: 'blog',
        status: 'queued',
        progress: { current: 0, total: 0 }
      });
      
      // 중복 체크로 인해 기존 ID가 반환될 수 있음
      if (!jobs.find(j => j.jobId === blogJobId)) {
        jobs.push({
          userId: user.id.toString(),
          userName: user.name,
          type: 'blog',
          jobId: blogJobId
        });
        
        console.log(`[Queue] Added Blog job for ${user.name} (${blogJobId})`);
      }
    }
    
    // 광고 데이터 새로고침 (API 키가 있는 경우만)
    if (user.naverAdsCustomerId && user.naverAdsAccessKey && user.naverAdsSecretKey && 
        (type === 'all' || type === 'ads')) {
      adsJobs.push({
        userId: user.id,
        userName: user.name
      });
      console.log(`[Queue] Added Ads refresh job for ${user.name}`);
    }
  }
  
  console.log(`[Tracking] Total ${jobs.length + adsJobs.length} jobs queued. Starting execution...`);

  // 2단계: 큐에 등록된 작업들을 순차적으로 실행
  const results: TrackingResult[] = [];
  
  // 스마트플레이스와 블로그 추적
  for (const job of jobs) {
    console.log(`[Execution] Starting ${job.type} tracking for ${job.userName}...`);
    
    if (job.type === 'smartplace') {
      const result = await trackSmartPlaceForUser(job.userId, job.userName, job.jobId);
      results.push(result);
    } else if (job.type === 'blog') {
      const result = await trackBlogForUser(job.userId, job.userName, job.jobId);
      results.push(result);
    }
  }
  
  // 광고 데이터 새로고침
  for (const adsJob of adsJobs) {
    console.log(`[Execution] Starting ads refresh for ${adsJob.userName}...`);
    try {
      const adsResult = await adsDataRefreshService.refreshUserAdsData(adsJob.userId);
      results.push({
        success: adsResult.success,
        userId: adsJob.userId.toString(),
        userName: adsJob.userName,
        type: 'ads',
        resultsCount: adsResult.dataCount,
        error: adsResult.error
      });
    } catch (error) {
      results.push({
        success: false,
        userId: adsJob.userId.toString(),
        userName: adsJob.userName,
        type: 'ads',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(`[Tracking] Completed all ${results.length} tracking jobs`);

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  return {
    success: successCount,
    failed: failedCount,
    results
  };
}

// Get tracking status
export function getTrackingStatus() {
  return trackingStatus;
}

// Reset tracking status
export function resetTrackingStatus() {
  trackingStatus = {
    smartplace: {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0
    },
    blog: {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0
    }
  };
}