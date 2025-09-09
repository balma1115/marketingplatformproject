import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import * as fs from 'fs'
import * as path from 'path'

interface PerformanceData {
  campaignId?: string
  adgroupId?: string
  keywordId?: string
  date: string
  impressions: number
  clicks: number
  cost: number
  ctr?: number
  cpc?: number
  avgRank?: number
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await verifyAuth(request)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const campaignId = searchParams.get('campaignId')
    const adgroupId = searchParams.get('adgroupId')
    const keywordIds = searchParams.get('keywordIds')?.split(',').filter(Boolean)
    const groupBy = searchParams.get('groupBy') || 'daily' // daily, keyword, adgroup, campaign

    const jsonDir = path.join(process.cwd(), 'data', 'json-processed')
    
    if (!fs.existsSync(jsonDir)) {
      return NextResponse.json({
        success: false,
        error: 'No processed data available'
      }, { status: 404 })
    }

    // Calculate date range
    let startDate = dateFrom ? new Date(dateFrom) : new Date()
    let endDate = dateTo ? new Date(dateTo) : new Date()
    
    // Default to last 7 days if no range specified
    if (!dateFrom && !dateTo) {
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 6)
    }

    // Collect data for each day
    const performanceMap = new Map<string, PerformanceData>()
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const filePath = path.join(jsonDir, `processed_${dateStr}.json`)
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        
        // Process raw data based on filters
        if (data.rawData && Array.isArray(data.rawData)) {
          data.rawData.forEach((row: any) => {
            // Apply filters
            if (campaignId && row.campaignId !== campaignId) return
            if (adgroupId && row.adgroupId !== adgroupId) return
            if (keywordIds && keywordIds.length > 0 && !keywordIds.includes(row.keywordId)) return
            
            // Determine grouping key
            let key = ''
            switch (groupBy) {
              case 'keyword':
                if (!row.keywordId || row.keywordId === '-') return
                key = row.keywordId
                break
              case 'adgroup':
                key = row.adgroupId
                break
              case 'campaign':
                key = row.campaignId
                break
              case 'daily':
              default:
                key = dateStr
                break
            }
            
            if (!key) return
            
            // Aggregate data
            if (!performanceMap.has(key)) {
              performanceMap.set(key, {
                date: groupBy === 'daily' ? dateStr : `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`,
                impressions: 0,
                clicks: 0,
                cost: 0,
                campaignId: row.campaignId,
                adgroupId: row.adgroupId,
                keywordId: groupBy === 'keyword' ? row.keywordId : undefined
              })
            }
            
            const perf = performanceMap.get(key)!
            perf.impressions += row.impressions || 0
            perf.clicks += row.clicks || 0
            perf.cost += row.cost || 0
          })
        }
      }
    }
    
    // Calculate CTR and CPC
    const performanceData = Array.from(performanceMap.values()).map(perf => {
      perf.ctr = perf.impressions > 0 ? (perf.clicks / perf.impressions * 100) : 0
      perf.cpc = perf.clicks > 0 ? (perf.cost / perf.clicks) : 0
      return perf
    })
    
    // Sort by date (for daily) or by impressions (for others)
    if (groupBy === 'daily') {
      performanceData.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      performanceData.sort((a, b) => b.impressions - a.impressions)
    }
    
    // Calculate totals
    const totals = performanceData.reduce((acc, perf) => ({
      impressions: acc.impressions + perf.impressions,
      clicks: acc.clicks + perf.clicks,
      cost: acc.cost + perf.cost
    }), {
      impressions: 0,
      clicks: 0,
      cost: 0
    })
    
    // Add overall CTR and CPC
    const summary = {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
      cpc: totals.clicks > 0 ? (totals.cost / totals.clicks) : 0,
      count: performanceData.length,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }
    }
    
    return NextResponse.json({
      success: true,
      data: performanceData,
      summary,
      groupBy
    })
    
  } catch (error) {
    console.error('Failed to fetch performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}

// POST: Get performance for specific entities
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entities, dateFrom, dateTo, type } = body
    
    if (!entities || !Array.isArray(entities)) {
      return NextResponse.json(
        { error: 'Entities array is required' },
        { status: 400 }
      )
    }
    
    const jsonDir = path.join(process.cwd(), 'data', 'json-processed')
    
    if (!fs.existsSync(jsonDir)) {
      return NextResponse.json({
        success: false,
        error: 'No processed data available'
      }, { status: 404 })
    }
    
    // Calculate date range
    let startDate = dateFrom ? new Date(dateFrom) : new Date()
    let endDate = dateTo ? new Date(dateTo) : new Date()
    
    // Default to last 7 days if no range specified
    if (!dateFrom && !dateTo) {
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 6)
    }
    
    // Collect performance for each entity
    const entityPerformance: Record<string, any> = {}
    
    entities.forEach(entityId => {
      entityPerformance[entityId] = {
        entityId,
        type,
        impressions: 0,
        clicks: 0,
        cost: 0,
        dailyData: []
      }
    })
    
    // Process each day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const filePath = path.join(jsonDir, `processed_${dateStr}.json`)
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        
        // Initialize daily data for each entity
        const dailyMap: Record<string, any> = {}
        entities.forEach(entityId => {
          dailyMap[entityId] = {
            date: dateStr,
            impressions: 0,
            clicks: 0,
            cost: 0
          }
        })
        
        // Process raw data
        if (data.rawData && Array.isArray(data.rawData)) {
          data.rawData.forEach((row: any) => {
            let entityId = ''
            
            switch (type) {
              case 'keyword':
                entityId = row.keywordId
                break
              case 'adgroup':
                entityId = row.adgroupId
                break
              case 'campaign':
                entityId = row.campaignId
                break
            }
            
            if (entityId && entities.includes(entityId)) {
              dailyMap[entityId].impressions += row.impressions || 0
              dailyMap[entityId].clicks += row.clicks || 0
              dailyMap[entityId].cost += row.cost || 0
              
              // Update totals
              entityPerformance[entityId].impressions += row.impressions || 0
              entityPerformance[entityId].clicks += row.clicks || 0
              entityPerformance[entityId].cost += row.cost || 0
            }
          })
        }
        
        // Add daily data to each entity
        entities.forEach(entityId => {
          if (dailyMap[entityId].impressions > 0 || dailyMap[entityId].clicks > 0) {
            dailyMap[entityId].ctr = dailyMap[entityId].impressions > 0 
              ? (dailyMap[entityId].clicks / dailyMap[entityId].impressions * 100) 
              : 0
            dailyMap[entityId].cpc = dailyMap[entityId].clicks > 0 
              ? (dailyMap[entityId].cost / dailyMap[entityId].clicks) 
              : 0
            entityPerformance[entityId].dailyData.push(dailyMap[entityId])
          }
        })
      }
    }
    
    // Calculate CTR and CPC for each entity
    Object.values(entityPerformance).forEach((perf: any) => {
      perf.ctr = perf.impressions > 0 ? (perf.clicks / perf.impressions * 100) : 0
      perf.cpc = perf.clicks > 0 ? (perf.cost / perf.clicks) : 0
    })
    
    return NextResponse.json({
      success: true,
      data: entityPerformance,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch entity performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entity performance' },
      { status: 500 }
    )
  }
}