/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'
import { safeParseJson } from '../services/errorUtils'
import { captureException, logWarn } from '../services/observability'
import type { PlanId } from '../types/subscription'

interface StudentUser {
  name: string
  email: string
  medicalSchool?: string
  onboarded: boolean
  tier: PlanId
}

interface StudentAuthContextType {
  user: StudentUser | null
  login: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string, medicalSchool?: string) => void
  logout: () => void
  completeOnboarding: () => void
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null)

function isStudentUser(value: unknown): value is StudentUser {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<StudentUser>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.onboarded === 'boolean' &&
    (candidate.tier === 'demo' || candidate.tier === 'basic' || candidate.tier === 'standard' || candidate.tier === 'premium')
  )
}

function normalizeLegacyTier(tier: unknown): PlanId {
  if (tier === 'demo' || tier === 'basic' || tier === 'standard' || tier === 'premium') {
    return tier
  }

  if (tier === 'Basic') return 'basic'
  if (tier === 'Pro') return 'standard'
  if (tier === 'Elite') return 'premium'
  return 'demo'
}

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUser | null>(() => {
    const parsed = safeParseJson<unknown>(localStorage.getItem('studentUser'))
    if (!parsed) return null
    if (isStudentUser(parsed)) return parsed

    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as Partial<StudentUser> & { tier?: unknown }
      if (typeof candidate.name === 'string' && typeof candidate.email === 'string' && typeof candidate.onboarded === 'boolean') {
        const migrated: StudentUser = {
          name: candidate.name,
          email: candidate.email,
          onboarded: candidate.onboarded,
          medicalSchool: candidate.medicalSchool,
          tier: normalizeLegacyTier(candidate.tier),
        }
        localStorage.setItem('studentUser', JSON.stringify(migrated))
        return migrated
      }
    }

    logWarn('Ignored malformed persisted student user')
    localStorage.removeItem('studentUser')
    return null
  })

  const login = (email: string, password: string): boolean => {
    // Demo: any non-empty credentials work; preset demo account
    void password
    if (!email.trim()) return false
    const stored = localStorage.getItem('studentUser')
    if (stored) {
      const parsed = safeParseJson<unknown>(stored)
      if (isStudentUser(parsed)) {
        setUser(parsed)
        return true
      }

      logWarn('Clearing invalid persisted student user during login')
      localStorage.removeItem('studentUser')
    }
    // Create demo user if none exists
    const demoUser: StudentUser = {
      name: 'Demo Student',
      email,
      onboarded: false,
      tier: 'demo',
    }
    localStorage.setItem('studentUser', JSON.stringify(demoUser))
    setUser(demoUser)
    return true
  }

  const register = (name: string, email: string, _password: string, medicalSchool?: string) => {
    try {
      const newUser: StudentUser = {
        name,
        email,
        medicalSchool,
        onboarded: false,
        tier: 'demo',
      }
      localStorage.setItem('studentUser', JSON.stringify(newUser))
      setUser(newUser)
    } catch (error) {
      captureException(error, { feature: 'student-auth', action: 'register' })
    }
  }

  const logout = () => {
    localStorage.removeItem('studentUser')
    setUser(null)
  }

  const completeOnboarding = () => {
    if (!user) return
    try {
      const updated = { ...user, onboarded: true }
      localStorage.setItem('studentUser', JSON.stringify(updated))
      setUser(updated)
    } catch (error) {
      captureException(error, { feature: 'student-auth', action: 'complete-onboarding' })
    }
  }

  return (
    <StudentAuthContext.Provider value={{ user, login, register, logout, completeOnboarding }}>
      {children}
    </StudentAuthContext.Provider>
  )
}

export const useStudentAuth = () => {
  const ctx = useContext(StudentAuthContext)
  if (!ctx) throw new Error('useStudentAuth must be used within StudentAuthProvider')
  return ctx
}
