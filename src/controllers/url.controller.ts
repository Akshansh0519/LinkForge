import { Request, Response } from 'express'
import QRCode from 'qrcode'
import * as urlService from '../services/url.service'
import { AppError } from '../lib/errors'
import prisma from '../lib/prisma'

/**
 * POST /api/urls
 * Create a new shortened URL.
 */
export async function createUrl(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  const result = await urlService.createUrl(userId, req.body)
  res.status(201).json(result)
}

/**
 * GET /api/urls
 * List URLs for the authenticated user with pagination.
 */
export async function listUrls(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  // parsedQuery is set by validateQuery middleware
  const { page, limit } = (req as Request & { parsedQuery: { page: number; limit: number } }).parsedQuery
  const result = await urlService.listUrls(userId, page, limit)
  res.status(200).json(result)
}

/**
 * GET /api/urls/:id
 * Get a single URL by ID.
 */
export async function getUrl(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  const result = await urlService.getUrl(req.params.id, userId)
  res.status(200).json(result)
}

/**
 * PATCH /api/urls/:id
 * Update a URL.
 */
export async function updateUrl(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  const result = await urlService.updateUrl(req.params.id, userId, req.body)
  res.status(200).json(result)
}

/**
 * DELETE /api/urls/:id
 * Delete a URL.
 */
export async function deleteUrl(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  await urlService.deleteUrl(req.params.id, userId)
  res.status(204).send()
}

/**
 * GET /api/urls/:id/qr
 * Generate and return QR code PNG for the short URL.
 */
export async function getQr(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId
  const url = await prisma.url.findUnique({
    where: { id: req.params.id },
    select: { slug: true, userId: true },
  })

  if (!url) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (url.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const shortUrl = `${process.env.BASE_URL}/${url.slug}`
  const qrBuffer = await QRCode.toBuffer(shortUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Content-Disposition', `attachment; filename="${url.slug}-qr.png"`)
  res.send(qrBuffer)
}
