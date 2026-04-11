/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'
import { safeParseJson } from '../services/errorUtils'
import { captureException, logWarn } from '../services/observability'

export interface Announcement {
  id: string
  title: string
  message: string
  createdAtIso: string
  createdBy: string
}

interface CreateAnnouncementInput {
  title: string
  message: string
  createdBy: string
}

interface AnnouncementContextType {
  announcements: Announcement[]
  postAnnouncement: (input: CreateAnnouncementInput) => void
  unreadCount: (studentKey: string) => number
  isRead: (studentKey: string, announcementId: string) => boolean
  markAsRead: (studentKey: string, announcementId: string) => void
  markAllAsRead: (studentKey: string) => void
}

type ReadMap = Record<string, string[]>

const ANNOUNCEMENTS_STORAGE_KEY = 'announcements.v1'
const ANNOUNCEMENT_READS_STORAGE_KEY = 'announcementReadsByStudent.v1'

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ANN-1001',
    title: 'Welcome to NextGen Updates',
    message: 'Admins can now broadcast platform updates here. Check this inbox regularly.',
    createdAtIso: new Date().toISOString(),
    createdBy: 'Admin',
  },
]

const AnnouncementContext = createContext<AnnouncementContextType | null>(null)

function isAnnouncement(value: unknown): value is Announcement {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<Announcement>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.createdAtIso === 'string' &&
    typeof candidate.createdBy === 'string'
  )
}

function loadAnnouncements(): Announcement[] {
  const parsed = safeParseJson<unknown>(localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY))
  if (!parsed) return DEFAULT_ANNOUNCEMENTS
  if (!Array.isArray(parsed) || !parsed.every(isAnnouncement)) {
    logWarn('Invalid announcements payload in localStorage, resetting to defaults')
    localStorage.removeItem(ANNOUNCEMENTS_STORAGE_KEY)
    return DEFAULT_ANNOUNCEMENTS
  }

  return [...parsed].sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
}

function loadReads(): ReadMap {
  const parsed = safeParseJson<unknown>(localStorage.getItem(ANNOUNCEMENT_READS_STORAGE_KEY))
  if (!parsed) return {}
  if (!parsed || typeof parsed !== 'object') {
    logWarn('Invalid announcement reads payload in localStorage, clearing value')
    localStorage.removeItem(ANNOUNCEMENT_READS_STORAGE_KEY)
    return {}
  }

  const entries = Object.entries(parsed as Record<string, unknown>)
  const sanitized: ReadMap = {}
  entries.forEach(([key, value]) => {
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      sanitized[key] = value
    }
  })

  return sanitized
}

export const AnnouncementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadAnnouncements())
  const [readsByStudent, setReadsByStudent] = useState<ReadMap>(() => loadReads())

  const persistAnnouncements = (next: Announcement[]) => {
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      captureException(error, { feature: 'announcements', action: 'persist-announcements' })
    }
  }

  const persistReads = (next: ReadMap) => {
    try {
      localStorage.setItem(ANNOUNCEMENT_READS_STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      captureException(error, { feature: 'announcements', action: 'persist-reads' })
    }
  }

  const postAnnouncement = (input: CreateAnnouncementInput) => {
    const trimmedTitle = input.title.trim()
    const trimmedMessage = input.message.trim()
    const trimmedCreator = input.createdBy.trim() || 'Admin'

    if (!trimmedTitle || !trimmedMessage) return

    const nextAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      title: trimmedTitle,
      message: trimmedMessage,
      createdAtIso: new Date().toISOString(),
      createdBy: trimmedCreator,
    }

    setAnnouncements(previous => {
      const next = [nextAnnouncement, ...previous]
      persistAnnouncements(next)
      return next
    })
  }

  const isRead = (studentKey: string, announcementId: string): boolean => {
    if (!studentKey) return false
    const readIds = readsByStudent[studentKey] ?? []
    return readIds.includes(announcementId)
  }

  const unreadCount = (studentKey: string): number => {
    if (!studentKey) return 0
    const readIds = new Set(readsByStudent[studentKey] ?? [])
    return announcements.reduce((count, announcement) => count + (readIds.has(announcement.id) ? 0 : 1), 0)
  }

  const markAsRead = (studentKey: string, announcementId: string) => {
    if (!studentKey || !announcementId) return

    setReadsByStudent(previous => {
      const currentReadIds = previous[studentKey] ?? []
      if (currentReadIds.includes(announcementId)) return previous

      const next: ReadMap = {
        ...previous,
        [studentKey]: [announcementId, ...currentReadIds],
      }
      persistReads(next)
      return next
    })
  }

  const markAllAsRead = (studentKey: string) => {
    if (!studentKey) return

    setReadsByStudent(previous => {
      const allAnnouncementIds = announcements.map(announcement => announcement.id)
      const next: ReadMap = {
        ...previous,
        [studentKey]: allAnnouncementIds,
      }
      persistReads(next)
      return next
    })
  }

  const value: AnnouncementContextType = {
    announcements,
    postAnnouncement,
    unreadCount,
    isRead,
    markAsRead,
    markAllAsRead,
  }

  return <AnnouncementContext.Provider value={value}>{children}</AnnouncementContext.Provider>
}

export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext)
  if (!context) throw new Error('useAnnouncements must be used within AnnouncementProvider')
  return context
}
