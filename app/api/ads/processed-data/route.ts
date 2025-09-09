import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await verifyAuth(request)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL 파라미터에서 날짜 범위 가져오기
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const period = searchParams.get('period') // daily, monthly, all

    const jsonDir = path.join(process.cwd(), 'data', 'json-processed')
    
    if (!fs.existsSync(jsonDir)) {
      return NextResponse.json({
        success: false,
        error: 'No processed data available'
      }, { status: 404 })
    }

    let responseData: any = {
      success: true,
      data: null
    }

    if (period === 'monthly') {
      // Return monthly summaries
      const monthlyFiles = fs.readdirSync(jsonDir)
        .filter(file => file.startsWith('monthly_'))
        .sort()
      
      const monthlyData = monthlyFiles.map(file => {
        const filePath = path.join(jsonDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return data
      })

      responseData.data = {
        period: 'monthly',
        months: monthlyData
      }

    } else if (period === 'summary') {
      // Return overall summary
      const summaryPath = path.join(jsonDir, '90days-summary.json')
      if (fs.existsSync(summaryPath)) {
        const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
        responseData.data = {
          period: 'summary',
          summary: summaryData
        }
      }

    } else {
      // Return daily data within date range
      let startDate = dateFrom ? new Date(dateFrom) : new Date()
      let endDate = dateTo ? new Date(dateTo) : new Date()
      
      // Default to last 7 days if no range specified
      if (!dateFrom && !dateTo) {
        endDate = new Date()
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 6)
      }

      const dailyData = []
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0]
        const filePath = path.join(jsonDir, `processed_${dateStr}.json`)
        
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          dailyData.push({
            date: dateStr,
            ...data
          })
        }
      }

      // Calculate totals for the period
      const totals = {
        all: {
          impressions: 0,
          clicks: 0,
          cost: 0,
          costWithVAT: 0
        },
        keywords: {
          impressions: 0,
          clicks: 0,
          cost: 0,
          costWithVAT: 0
        },
        expanded: {
          impressions: 0,
          clicks: 0,
          cost: 0,
          costWithVAT: 0
        }
      }

      dailyData.forEach(day => {
        totals.all.impressions += day.totals.all.impressions
        totals.all.clicks += day.totals.all.clicks
        totals.all.cost += day.totals.all.cost
        totals.all.costWithVAT += day.totals.all.costWithVAT
        
        totals.keywords.impressions += day.totals.keywords.impressions
        totals.keywords.clicks += day.totals.keywords.clicks
        totals.keywords.cost += day.totals.keywords.cost
        totals.keywords.costWithVAT += day.totals.keywords.costWithVAT
        
        totals.expanded.impressions += day.totals.expanded.impressions
        totals.expanded.clicks += day.totals.expanded.clicks
        totals.expanded.cost += day.totals.expanded.cost
        totals.expanded.costWithVAT += day.totals.expanded.costWithVAT
      })

      // Calculate metrics
      totals.all.ctr = totals.all.impressions > 0 ? 
        (totals.all.clicks / totals.all.impressions * 100) : 0
      totals.all.cpc = totals.all.clicks > 0 ? 
        (totals.all.cost / totals.all.clicks) : 0
        
      totals.keywords.ctr = totals.keywords.impressions > 0 ? 
        (totals.keywords.clicks / totals.keywords.impressions * 100) : 0
      totals.keywords.cpc = totals.keywords.clicks > 0 ? 
        (totals.keywords.cost / totals.keywords.clicks) : 0
        
      totals.expanded.ctr = totals.expanded.impressions > 0 ? 
        (totals.expanded.clicks / totals.expanded.impressions * 100) : 0
      totals.expanded.cpc = totals.expanded.clicks > 0 ? 
        (totals.expanded.cost / totals.expanded.clicks) : 0

      // Calculate percentages
      const totalImpressions = totals.all.impressions
      totals.keywords.percentage = totalImpressions > 0 ? 
        (totals.keywords.impressions / totalImpressions * 100) : 0
      totals.expanded.percentage = totalImpressions > 0 ? 
        (totals.expanded.impressions / totalImpressions * 100) : 0

      responseData.data = {
        period: 'daily',
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        days: dailyData.length,
        totals,
        dailyBreakdown: dailyData
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Failed to fetch processed data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processed data' },
      { status: 500 }
    )
  }
}