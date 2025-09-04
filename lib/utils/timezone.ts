/**
 * Timezone utilities for Korean Standard Time (KST)
 */

/**
 * Get current date in KST (UTC+9)
 */
export function getKSTDate(): Date {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const kstOffset = 9 * 60 * 60000 // KST is UTC+9
  return new Date(utc + kstOffset)
}

/**
 * Get today's date at midnight in KST
 */
export function getKSTToday(): Date {
  const kstNow = getKSTDate()
  kstNow.setHours(0, 0, 0, 0)
  return kstNow
}

/**
 * Convert any date to KST
 */
export function toKST(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000)
  const kstOffset = 9 * 60 * 60000
  return new Date(utc + kstOffset)
}

/**
 * Format date to KST string (YYYY-MM-DD HH:mm:ss KST)
 */
export function formatKST(date: Date | string): string {
  const kstDate = typeof date === 'string' ? toKST(date) : toKST(date)
  const year = kstDate.getFullYear()
  const month = String(kstDate.getMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getDate()).padStart(2, '0')
  const hours = String(kstDate.getHours()).padStart(2, '0')
  const minutes = String(kstDate.getMinutes()).padStart(2, '0')
  const seconds = String(kstDate.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} KST`
}

/**
 * Get date string in KST format (YYYY-MM-DD)
 */
export function getKSTDateString(date?: Date | string): string {
  const kstDate = date ? toKST(date) : getKSTDate()
  const year = kstDate.getFullYear()
  const month = String(kstDate.getMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Check if two dates are the same day in KST
 */
export function isSameKSTDay(date1: Date | string, date2: Date | string): boolean {
  const kst1 = toKST(date1)
  const kst2 = toKST(date2)
  
  return kst1.getFullYear() === kst2.getFullYear() &&
         kst1.getMonth() === kst2.getMonth() &&
         kst1.getDate() === kst2.getDate()
}

/**
 * Get the start and end of today in KST (for database queries)
 */
export function getKSTTodayRange(): { start: Date; end: Date } {
  const start = getKSTToday()
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)
  
  return { start, end }
}

/**
 * Convert KST to UTC for database storage
 */
export function kstToUTC(kstDate: Date): Date {
  const kstOffset = 9 * 60 * 60000 // KST is UTC+9
  return new Date(kstDate.getTime() - kstOffset)
}

/**
 * Get days difference between two dates in KST
 */
export function getDaysAgoInKST(date: Date | string): number {
  const kstDate = toKST(date)
  const kstToday = getKSTToday()
  const diffTime = kstToday.getTime() - kstDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Format relative time in KST (e.g., "오늘", "어제", "2일 전")
 */
export function formatRelativeKST(date: Date | string): string {
  const daysAgo = getDaysAgoInKST(date)
  
  if (daysAgo === 0) return '오늘'
  if (daysAgo === 1) return '어제'
  if (daysAgo < 7) return `${daysAgo}일 전`
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}주 전`
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)}개월 전`
  
  return `${Math.floor(daysAgo / 365)}년 전`
}