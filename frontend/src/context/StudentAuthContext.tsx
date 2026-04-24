/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'
import { safeParseJson } from '../services/errorUtils'
import { captureException, logWarn } from '../services/observability'
import { completeStudentOnboarding, loginStudent, registerStudent } from '../services/authApi'
import type { PlanId } from '../types/subscription'

interface StudentUser {
  id: string
  name: string
  email: string
  medicalSchool?: string
  onboarded: boolean
  tier: PlanId
}

interface StudentSession {
  accessToken: string
  refreshToken: string | null
}

interface PersistedStudentAuth {
  user: StudentUser
  session: StudentSession
}

interface StudentAuthContextType {
  user: StudentUser | null
  login: (email: string, password: string) => Promise<StudentUser>
  register: (name: string, email: string, password: string, medicalSchool?: string) => Promise<StudentUser>
  logout: () => void
  completeOnboarding: () => Promise<void>
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null)
const STUDENT_AUTH_KEY = 'nextgen.student.auth'
const LEGACY_STUDENT_KEY = 'studentUser'
const STUDENT_ONBOARDING_KEY = 'nextgen.student.onboarding'

type OnboardingByEmail = Record<string, boolean>

function isStudentUser(value: unknown): value is StudentUser {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<StudentUser>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.onboarded === 'boolean' &&
    typeof candidate.tier === 'string'
  )
}

function isPersistedStudentAuth(value: unknown): value is PersistedStudentAuth {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<PersistedStudentAuth>
  if (!isStudentUser(candidate.user)) return false
  if (!candidate.session || typeof candidate.session !== 'object') return false

  const session = candidate.session as Partial<StudentSession>
  return typeof session.accessToken === 'string' && (typeof session.refreshToken === 'string' || session.refreshToken === null)
}

function normalizeLegacyTier(tier: unknown): PlanId {
  if (typeof tier === 'string') {
    const normalized = tier.trim().toLowerCase()
    if (normalized.length === 0) return 'demo'
    if (normalized === 'pro') return 'standard'
    if (normalized === 'elite') return 'premium'
    return normalized
  }

  return 'demo'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function loadOnboardingByEmail(): OnboardingByEmail {
  const parsed = safeParseJson<unknown>(localStorage.getItem(STUDENT_ONBOARDING_KEY))
  if (!parsed || typeof parsed !== 'object') return {}

  const entries = Object.entries(parsed as Record<string, unknown>)
  return Object.fromEntries(entries.filter(([, value]) => typeof value === 'boolean')) as OnboardingByEmail
}

function saveOnboardingByEmail(map: OnboardingByEmail) {
  localStorage.setItem(STUDENT_ONBOARDING_KEY, JSON.stringify(map))
}

function getPersistedOnboarding(email: string): boolean {
  const map = loadOnboardingByEmail()
  return map[normalizeEmail(email)] ?? false
}

function setPersistedOnboarding(email: string, onboarded: boolean) {
  const map = loadOnboardingByEmail()
  map[normalizeEmail(email)] = onboarded
  saveOnboardingByEmail(map)
}

function getNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim()
  if (!localPart) return 'Student'

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function persistStudentAuth(state: PersistedStudentAuth) {
  localStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(state))
  localStorage.setItem(LEGACY_STUDENT_KEY, JSON.stringify(state.user))
  setPersistedOnboarding(state.user.email, state.user.onboarded)
}

function loadInitialStudentUser(): StudentUser | null {
  const persisted = safeParseJson<unknown>(localStorage.getItem(STUDENT_AUTH_KEY))
  if (isPersistedStudentAuth(persisted)) {
    return persisted.user
  }

  const legacy = safeParseJson<unknown>(localStorage.getItem(LEGACY_STUDENT_KEY))
  if (!legacy || typeof legacy !== 'object') {
    return null
  }

  const candidate = legacy as Partial<StudentUser> & { tier?: unknown }
  if (typeof candidate.name !== 'string' || typeof candidate.email !== 'string' || typeof candidate.onboarded !== 'boolean') {
    logWarn('Ignored malformed persisted student user')
    localStorage.removeItem(LEGACY_STUDENT_KEY)
    localStorage.removeItem(STUDENT_AUTH_KEY)
    return null
  }

  const migratedUser: StudentUser = {
    id: typeof candidate.id === 'string' ? candidate.id : `legacy-${candidate.email.toLowerCase()}`,
    name: candidate.name,
    email: candidate.email,
    onboarded: candidate.onboarded,
    medicalSchool: candidate.medicalSchool,
    tier: normalizeLegacyTier(candidate.tier),
  }

  localStorage.setItem(LEGACY_STUDENT_KEY, JSON.stringify(migratedUser))
  return migratedUser
}

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUser | null>(() => loadInitialStudentUser())

  const login = async (email: string, password: string): Promise<StudentUser> => {
    const normalizedEmail = normalizeEmail(email)
    const response = await loginStudent({ email: normalizedEmail, password })

    if (!response.session?.access_token) {
      throw new Error('Unable to sign in. Please try again.')
    }

    const previousUser = user?.email.toLowerCase() === normalizedEmail ? user : null
    const persistedOnboarded = getPersistedOnboarding(response.user.email)

    const loggedInUser: StudentUser = {
      id: response.user.id,
      name: previousUser?.name ?? getNameFromEmail(response.user.email),
      email: response.user.email,
      medicalSchool: previousUser?.medicalSchool,
      onboarded: response.user.onboarded || previousUser?.onboarded || persistedOnboarded,
      tier: previousUser?.tier ?? 'demo',
    }

    const session: StudentSession = {
      accessToken: response.session.access_token,
      refreshToken: response.session.refresh_token,
    }

    persistStudentAuth({ user: loggedInUser, session })
    setUser(loggedInUser)
    return loggedInUser
  }

  const register = async (name: string, email: string, password: string, medicalSchool?: string): Promise<StudentUser> => {
    const normalizedEmail = normalizeEmail(email)
    const response = await registerStudent({
      email: normalizedEmail,
      password,
      fullName: name.trim(),
      medicalSchool: medicalSchool?.trim() ? medicalSchool.trim() : undefined,
    })

    const persistedOnboarded = getPersistedOnboarding(response.user.email)

    if (!response.session?.access_token) {
      throw new Error('Account created. Please verify your email before signing in.')
    }

    const newUser: StudentUser = {
      id: response.user.id,
      name: name.trim(),
      email: response.user.email,
      medicalSchool: medicalSchool?.trim() ? medicalSchool.trim() : undefined,
      onboarded: response.user.onboarded || persistedOnboarded,
      tier: 'demo',
    }

    const session: StudentSession = {
      accessToken: response.session.access_token,
      refreshToken: response.session.refresh_token,
    }

    persistStudentAuth({ user: newUser, session })
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    localStorage.removeItem(STUDENT_AUTH_KEY)
    localStorage.removeItem(LEGACY_STUDENT_KEY)
    setUser(null)
  }

  const completeOnboarding = async () => {
    if (!user) return

    const persisted = safeParseJson<unknown>(localStorage.getItem(STUDENT_AUTH_KEY))

    try {
      if (isPersistedStudentAuth(persisted)) {
        await completeStudentOnboarding(persisted.session.accessToken)
      }
    } catch (error) {
      captureException(error, { feature: 'student-auth', action: 'complete-onboarding-api' })
    }

    try {
      const updated = { ...user, onboarded: true }
      setPersistedOnboarding(updated.email, true)

      if (isPersistedStudentAuth(persisted)) {
        persistStudentAuth({ ...persisted, user: updated })
      } else {
        localStorage.setItem(LEGACY_STUDENT_KEY, JSON.stringify(updated))
      }

      setUser(updated)
    } catch (error) {
      captureException(error, { feature: 'student-auth', action: 'complete-onboarding-local' })
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
