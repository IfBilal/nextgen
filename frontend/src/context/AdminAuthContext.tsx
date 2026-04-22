/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'
import { safeParseJson } from '../services/errorUtils'
import { logWarn } from '../services/observability'
import { loginAdmin } from '../services/authApi'

interface AdminUser {
  id: string
  name: string
  email: string
}

interface AdminSession {
  accessToken: string
  refreshToken: string | null
}

interface PersistedAdminAuth {
  admin: AdminUser
  session: AdminSession
}

interface AdminAuthContextType {
  admin: AdminUser | null
  login: (email: string, password: string) => Promise<AdminUser>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null)
const ADMIN_AUTH_KEY = 'nextgen.admin.auth'
const LEGACY_ADMIN_KEY = 'adminUser'

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AdminUser>
  return typeof candidate.id === 'string' && typeof candidate.name === 'string' && typeof candidate.email === 'string'
}

function isPersistedAdminAuth(value: unknown): value is PersistedAdminAuth {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<PersistedAdminAuth>
  if (!isAdminUser(candidate.admin)) return false
  if (!candidate.session || typeof candidate.session !== 'object') return false

  const session = candidate.session as Partial<AdminSession>
  return typeof session.accessToken === 'string' && (typeof session.refreshToken === 'string' || session.refreshToken === null)
}

function getNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim()
  if (!localPart) return 'Admin'

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function persistAdminAuth(state: PersistedAdminAuth) {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(state))
  localStorage.setItem(LEGACY_ADMIN_KEY, JSON.stringify(state.admin))
}

function loadInitialAdmin(): AdminUser | null {
  const persisted = safeParseJson<unknown>(localStorage.getItem(ADMIN_AUTH_KEY))
  if (isPersistedAdminAuth(persisted)) {
    return persisted.admin
  }

  const legacy = safeParseJson<unknown>(localStorage.getItem(LEGACY_ADMIN_KEY))
  if (!legacy || typeof legacy !== 'object') return null

  const candidate = legacy as Partial<AdminUser>
  if (typeof candidate.name === 'string' && typeof candidate.email === 'string') {
    return {
      id: typeof candidate.id === 'string' ? candidate.id : `legacy-${candidate.email.toLowerCase()}`,
      name: candidate.name,
      email: candidate.email,
    }
  }

  logWarn('Ignored malformed persisted admin user')
  localStorage.removeItem(LEGACY_ADMIN_KEY)
  localStorage.removeItem(ADMIN_AUTH_KEY)
  return null
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => loadInitialAdmin())

  const login = async (email: string, password: string): Promise<AdminUser> => {
    const response = await loginAdmin({
      email: email.trim().toLowerCase(),
      password,
    })

    const adminUser: AdminUser = {
      id: response.user.id,
      name: getNameFromEmail(response.user.email),
      email: response.user.email,
    }

    const session: AdminSession = {
      accessToken: response.session.access_token,
      refreshToken: response.session.refresh_token,
    }

    persistAdminAuth({ admin: adminUser, session })
    setAdmin(adminUser)
    return adminUser
  }

  const logout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY)
    localStorage.removeItem(LEGACY_ADMIN_KEY)
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
