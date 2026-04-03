import React, { createContext, useContext, useState } from 'react'

interface StudentUser {
  name: string
  email: string
  medicalSchool?: string
  onboarded: boolean
  tier: 'Basic' | 'Pro' | 'Elite'
}

interface StudentAuthContextType {
  user: StudentUser | null
  login: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string, medicalSchool?: string) => void
  logout: () => void
  completeOnboarding: () => void
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null)

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUser | null>(() => {
    const stored = localStorage.getItem('studentUser')
    return stored ? JSON.parse(stored) : null
  })

  const login = (email: string, _password: string): boolean => {
    // Demo: any non-empty credentials work; preset demo account
    if (!email.trim()) return false
    const stored = localStorage.getItem('studentUser')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      return true
    }
    // Create demo user if none exists
    const demoUser: StudentUser = {
      name: 'Demo Student',
      email,
      onboarded: false,
      tier: 'Pro',
    }
    localStorage.setItem('studentUser', JSON.stringify(demoUser))
    setUser(demoUser)
    return true
  }

  const register = (name: string, email: string, _password: string, medicalSchool?: string) => {
    const newUser: StudentUser = {
      name,
      email,
      medicalSchool,
      onboarded: false,
      tier: 'Basic',
    }
    localStorage.setItem('studentUser', JSON.stringify(newUser))
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('studentUser')
    setUser(null)
  }

  const completeOnboarding = () => {
    if (!user) return
    const updated = { ...user, onboarded: true }
    localStorage.setItem('studentUser', JSON.stringify(updated))
    setUser(updated)
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
