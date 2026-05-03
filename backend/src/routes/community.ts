import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'

export const communityRouter = Router()

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'unknown',
  handler: (_req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many messages. Please wait before sending again.' }),
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── GET /api/v1/community/settings ──────────────────────────────────────────
communityRouter.get('/community/settings', authenticateRequest,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('community_settings').select('mode').eq('id', 1).single()
      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)
      return res.status(200).json({ mode: data.mode })
    } catch (err) { return next(err) }
  }
)

// ─── PUT /api/v1/community/settings ──────────────────────────────────────────
communityRouter.put('/community/settings', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode } = z.object({ mode: z.enum(['open', 'readonly']) }).parse(req.body)
      const { error } = await supabaseServiceClient
        .from('community_settings')
        .update({ mode, updated_at: new Date().toISOString() })
        .eq('id', 1)
      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ mode })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/community/messages ──────────────────────────────────────────
communityRouter.get('/community/messages', authenticateRequest,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('community_messages')
        .select('id, author_id, author_name, author_role, text, created_at')
        .order('created_at', { ascending: true })
        .limit(200)
      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)
      const messages = (data ?? []).map(m => ({
        id: m.id,
        authorId: m.author_id,
        authorName: m.author_name,
        authorRole: m.author_role,
        text: m.text,
        createdAt: m.created_at,
      }))
      return res.status(200).json({ messages })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/community/messages ─────────────────────────────────────────
const postSchema = z.object({ text: z.string().min(1).max(2000) })

communityRouter.post('/community/messages', authenticateRequest, chatLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.auth!.role
      if (role !== 'admin' && role !== 'student') {
        throw new HttpError(403, 'FORBIDDEN', 'Only students and admins can post.')
      }

      // Students can only post when mode is open
      if (role === 'student') {
        const { data: settings } = await supabaseServiceClient
          .from('community_settings').select('mode').eq('id', 1).single()
        if (settings?.mode === 'readonly') {
          throw new HttpError(403, 'POSTING_DISABLED', 'Community is in read-only mode.')
        }
      }

      const { text } = postSchema.parse(req.body)
      const authorId = req.auth!.userId

      const { data: profile } = await supabaseServiceClient
        .from('profiles').select('full_name').eq('id', authorId).single()
      const authorName = profile?.full_name ?? (role === 'admin' ? 'Admin' : 'Student')

      const { data, error } = await supabaseServiceClient
        .from('community_messages')
        .insert({ author_id: authorId, author_name: authorName, author_role: role, text })
        .select()
        .single()

      if (error) throw new HttpError(500, 'INSERT_FAILED', error.message)

      return res.status(201).json({
        message: {
          id: data.id,
          authorId: data.author_id,
          authorName: data.author_name,
          authorRole: data.author_role,
          text: data.text,
          createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/community/messages/:id ────────────────────────────────────
communityRouter.delete('/community/messages/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('community_messages').delete().eq('id', req.params.id)
      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ success: true })
    } catch (err) { return next(err) }
  }
)
