import { Request, Response } from 'express'
import * as analyticsService from '../services/analytics.service'

/**
 * GET /api/urls/:id/analytics
 * Get click analytics for a URL.
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  const result = await analyticsService.getAnalytics(req.params.id, userId)
  res.status(200).json(result)
}
