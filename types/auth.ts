export type UserRole = 'admin' | 'agency' | 'branch' | 'academy' | 'user'
export type SubscriptionPlan = 'basic' | 'platinum' | 'premium'

export interface User {
  id: string
  email: string
  password: string
  name: string
  phone: string
  role: UserRole
  plan: SubscriptionPlan
  academyName?: string
  academyAddress?: string
  agencyId?: string
  branchId?: string
  academyId?: string
  joinDate: string
  planExpiry: string
  usage: {
    blogPosts: number
    blogPostsLimit: number
    keywords: number
    keywordsLimit: number
    thumbnails: number
    thumbnailsLimit: number
  }
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}