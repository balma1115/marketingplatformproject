import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { trackingManager } from '@/lib/services/tracking-manager'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ jobId: string }> }
) {
  const params = await props.params

  return withAuth(req, async (request, userId) => {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Get job status from TrackingManager
    const job = trackingManager.getJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if job belongs to current user
    if (job.userId !== userId.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Return job status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      results: job.results,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    })
  })
}