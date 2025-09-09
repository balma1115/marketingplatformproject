import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
        { status: 400 }
      )
    }

    // Get date range from query params
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    // Use processed JSON data to get extended search results
    try {
      const fs = await import('fs')
      const path = await import('path')
      const jsonDir = path.join(process.cwd(), 'data', 'json-processed')
      
      let extendedSearchStats = {
        adgroupId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        ctr: 0,
        cpc: 0,
        devices: { M: 0, P: 0 }
      }
      
      if (fs.existsSync(jsonDir)) {
        // Process each day in the date range
        const start = dateFrom ? new Date(dateFrom) : new Date('2025-08-01')
        const end = dateTo ? new Date(dateTo) : new Date('2025-08-31')
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0]
          const filePath = path.join(jsonDir, `processed_${dateStr}.json`)
          
          if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            
            // Get extended search results for this adgroup
            if (data.extendedSearchResults && data.extendedSearchResults[adgroupId]) {
              const esr = data.extendedSearchResults[adgroupId]
              extendedSearchStats.impressions += esr.impressions || 0
              extendedSearchStats.clicks += esr.clicks || 0
              extendedSearchStats.cost += esr.cost || 0
              
              if (esr.devices) {
                extendedSearchStats.devices.M += esr.devices.M || 0
                extendedSearchStats.devices.P += esr.devices.P || 0
              }
            }
          }
        }
        
        // Calculate CTR and CPC
        extendedSearchStats.ctr = extendedSearchStats.impressions > 0 
          ? (extendedSearchStats.clicks / extendedSearchStats.impressions * 100) 
          : 0
        extendedSearchStats.cpc = extendedSearchStats.clicks > 0 
          ? (extendedSearchStats.cost / extendedSearchStats.clicks) 
          : 0
      }
      
      console.log(`Extended search stats for adgroup ${adgroupId}:`, extendedSearchStats)
      
      return NextResponse.json(extendedSearchStats)
      
    } catch (error) {
      console.error('Error processing extended search data:', error)
      // Return empty stats on error
      return NextResponse.json({
        adgroupId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        ctr: 0,
        cpc: 0,
        devices: { M: 0, P: 0 }
      })
    }
    
  } catch (error: any) {
    console.error('Error fetching extended search data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch extended search data',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}