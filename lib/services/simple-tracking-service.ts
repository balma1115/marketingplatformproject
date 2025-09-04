// Simplified tracking service without BullMQ for older Redis versions
import { prisma } from '@/lib/db';
import { ImprovedNaverScraperV3 } from './improved-scraper-v3';
import { NaverBlogScraperV2 } from './naver-blog-scraper-v2';
import { trackingManager } from './tracking-manager';

interface TrackingResult {
  success: boolean;
  userId: string;
  userName: string;
  type: 'smartplace' | 'blog';
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
      trackingStatus.smartplace.failed++;
      return { 
        success: false, 
        userId, 
        userName, 
        type: 'smartplace',
        error: 'No active keywords' 
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
          trackingManager.updateJob(jobId, {
            progress: { 
              current: processedCount, 
              total: keywords.length,
              currentKeyword: keyword.keyword
            }
          });
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
          trackingManager.updateJob(jobId, {
            progress: { 
              current: processedCount, 
              total: keywords.length,
              currentKeyword: keyword.keyword
            }
          });
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
          trackingManager.updateJob(jobId, {
            progress: { 
              current: processedCount, 
              total: keywords.length,
              currentKeyword: keyword.keyword
            }
          });
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
    
    // Get user's blog data
    const blog = await prisma.blogProject.findFirst({
      where: { userId: userIdInt }
    });

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

    // Get active keywords
    const keywords = await prisma.blogKeyword.findMany({
      where: {
        userId: userIdInt,
        isActive: true
      }
    });

    if (keywords.length === 0) {
      trackingStatus.blog.active--;
      trackingStatus.blog.failed++;
      return { 
        success: false, 
        userId, 
        userName, 
        type: 'blog',
        error: 'No active keywords' 
      };
    }

    // Update job with total keywords count
    if (jobId) {
      trackingManager.updateJob(jobId, {
        progress: { current: 0, total: keywords.length }
      });
    }
    
    // Initialize scraper
    const scraper = new NaverBlogScraperV2();
    let successCount = 0;
    let processedCount = 0;
    
    // Track all keywords
    for (const keyword of keywords) {
      processedCount++;
      
      // Update progress
      if (jobId) {
        trackingManager.updateJob(jobId, {
          progress: { 
            current: processedCount, 
            total: keywords.length,
            currentKeyword: keyword.keyword
          }
        });
      }
      try {
        const result = await scraper.checkBlogRanking(
          blog.blogUrl || '',
          keyword.keyword
        );

        // Save ranking result
        await prisma.blogRanking.create({
          data: {
            keywordId: keyword.id,
            checkDate: new Date(),
            rank: result.blogTabRank,
            mainTabExposed: result.mainTabExposed,
            found: result.mainTabExposed || result.blogTabRank !== null,
            url: result.url || null
          }
        });

        // Update keyword's last checked date
        await prisma.blogKeyword.update({
          where: { id: keyword.id },
          data: { lastChecked: new Date() }
        });
        
        successCount++;

      } catch (error) {
        console.error(`[Blog] Error tracking keyword "${keyword.keyword}":`, error);
      }
    }

    // Update blog project last updated
    await prisma.blogProject.update({
      where: { id: blog.id },
      data: { lastUpdated: new Date() }
    });

    // Close the scraper
    await scraper.close();

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
export async function trackAllUsers(): Promise<{ success: boolean; results: TrackingResult[] }> {
  // 기존 활성 작업 모두 취소
  trackingManager.cancelAllActiveJobs();
  console.log(`[Tracking] Cancelled all existing active jobs`);
  
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['academy', 'branch'] },  // admin과 agency는 제외
      isActive: true
    },
    include: {
      smartPlace: true,
      blogProjects: true
    }
  });

  // 1단계: 모든 작업을 큐에 등록
  const jobs: { userId: string; userName: string; type: 'smartplace' | 'blog'; jobId: string }[] = [];
  
  console.log(`[Tracking] Registering jobs for ${users.length} users...`);
  
  for (const user of users) {
    // SmartPlace가 등록된 경우 큐에 추가
    if (user.smartPlace) {
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

    // Blog가 등록된 경우 큐에 추가
    if (user.blogProjects && user.blogProjects.length > 0) {
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
  }
  
  console.log(`[Tracking] Total ${jobs.length} jobs queued. Starting execution...`);

  // 2단계: 큐에 등록된 작업들을 순차적으로 실행
  const results: TrackingResult[] = [];
  
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

  console.log(`[Tracking] Completed all ${results.length} tracking jobs`);

  return {
    success: true,
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