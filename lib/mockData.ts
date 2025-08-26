import { User } from '@/types/auth'

// Test accounts for each role
export const testAccounts: User[] = [
  // Admin Account
  {
    id: 'admin-001',
    email: 'admin@marketingplat.com',
    password: 'admin123',
    name: '관리자',
    phone: '010-1111-1111',
    role: 'admin',
    plan: 'premium',
    academyName: 'MarketingPlat 본사',
    joinDate: '2024-01-01',
    planExpiry: '2025-12-31',
    usage: {
      blogPosts: 0,
      blogPostsLimit: 999999,
      keywords: 0,
      keywordsLimit: 999999,
      thumbnails: 0,
      thumbnailsLimit: 999999
    }
  },
  
  // Agency Account
  {
    id: 'agency-001',
    email: 'agency@marketingplat.com',
    password: 'agency123',
    name: '김대행',
    phone: '010-2222-2222',
    role: 'agency',
    plan: 'premium',
    academyName: '스마트 마케팅 에이전시',
    academyAddress: '서울시 강남구',
    joinDate: '2024-02-01',
    planExpiry: '2025-02-28',
    usage: {
      blogPosts: 250,
      blogPostsLimit: 999999,
      keywords: 150,
      keywordsLimit: 999999,
      thumbnails: 500,
      thumbnailsLimit: 999999
    }
  },
  
  // Branch Account
  {
    id: 'branch-001',
    email: 'branch@marketingplat.com',
    password: 'branch123',
    name: '이지사',
    phone: '010-3333-3333',
    role: 'branch',
    plan: 'platinum',
    academyName: '강남교육지사',
    academyAddress: '서울시 강남구 역삼동',
    agencyId: 'agency-001',
    joinDate: '2024-03-01',
    planExpiry: '2025-03-31',
    usage: {
      blogPosts: 120,
      blogPostsLimit: 500,
      keywords: 80,
      keywordsLimit: 200,
      thumbnails: 200,
      thumbnailsLimit: 1000
    }
  },
  
  // Academy Account
  {
    id: 'academy-001',
    email: 'academy@marketingplat.com',
    password: 'academy123',
    name: '박원장',
    phone: '010-4444-4444',
    role: 'academy',
    plan: 'platinum',
    academyName: 'ABC영어학원',
    academyAddress: '서울시 송파구 잠실동',
    branchId: 'branch-001',
    joinDate: '2024-04-01',
    planExpiry: '2025-04-30',
    usage: {
      blogPosts: 35,
      blogPostsLimit: 50,
      keywords: 15,
      keywordsLimit: 20,
      thumbnails: 28,
      thumbnailsLimit: 100
    }
  },
  
  // General User Account
  {
    id: 'user-001',
    email: 'user@marketingplat.com',
    password: 'user123',
    name: '일반회원',
    phone: '010-5555-5555',
    role: 'user',
    plan: 'basic',
    joinDate: '2024-05-01',
    planExpiry: '2024-05-31',
    usage: {
      blogPosts: 0,
      blogPostsLimit: 0,
      keywords: 0,
      keywordsLimit: 0,
      thumbnails: 0,
      thumbnailsLimit: 0
    }
  }
]

// Helper function to get user by email and password
export function authenticateUser(email: string, password: string): User | null {
  const user = testAccounts.find(
    account => account.email === email && account.password === password
  )
  return user || null
}

// Mock data for dashboards
export const mockDashboardData = {
  // Admin dashboard data
  admin: {
    totalUsers: 1234,
    activeUsers: 1050,
    totalRevenue: 123450000,
    monthlyGrowth: 15.3,
    apiUsage: {
      today: 12543,
      thisMonth: 380000,
      limit: 1000000
    },
    agencyRequests: 45,
    systemHealth: {
      apiStatus: 'operational',
      dbStatus: 'operational',
      cacheStatus: 'operational'
    }
  },
  
  // Agency dashboard data
  agency: {
    managedBranches: 5,
    managedAcademies: 23,
    activeCampaigns: 12,
    totalRevenue: 45000000,
    monthlyPerformance: {
      revenue: 5000000,
      newClients: 3,
      churnRate: 2.1
    }
  },
  
  // Branch dashboard data
  branch: {
    managedAcademies: 8,
    totalStudents: 450,
    monthlyRevenue: 12000000,
    performanceScore: 87,
    topAcademies: [
      { name: 'ABC영어학원', students: 120, revenue: 3000000 },
      { name: 'XYZ수학학원', students: 95, revenue: 2500000 },
      { name: '한빛국어학원', students: 80, revenue: 2000000 }
    ]
  },
  
  // Academy dashboard data
  academy: {
    totalStudents: 120,
    newStudents: 8,
    blogRanking: 3.2,
    smartplaceScore: 4.8,
    adPerformance: {
      impressions: 45000,
      clicks: 1350,
      ctr: 3.0,
      cpc: 850
    },
    instagramStats: {
      followers: 1234,
      engagement: 5.2,
      reach: 5234
    }
  },
  
  // User dashboard data
  user: {
    trialDaysLeft: 7,
    featuresUnlocked: 0,
    plansAvailable: ['basic', 'platinum', 'premium']
  }
}