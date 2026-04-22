import { apiRequest } from './httpClient'

export interface AuthSession {
  access_token: string
  refresh_token: string | null
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    role: 'student' | 'admin'
  }
  session: AuthSession
}

export interface MessageResponse {
  message: string
}

interface StudentRegisterPayload {
  email: string
  password: string
  fullName: string
  medicalSchool?: string
}

interface LoginPayload {
  email: string
  password: string
}

interface ForgotPasswordPayload {
  email: string
}

interface ResetPasswordPayload {
  accessToken: string
  refreshToken: string
  newPassword: string
}

export function registerStudent(payload: StudentRegisterPayload) {
  return apiRequest<AuthResponse>('/auth/student/register', {
    method: 'POST',
    body: payload,
  })
}

export function loginStudent(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/student/login', {
    method: 'POST',
    body: payload,
  })
}

export function loginAdmin(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/admin/login', {
    method: 'POST',
    body: payload,
  })
}

export function forgotStudentPassword(payload: ForgotPasswordPayload) {
  return apiRequest<MessageResponse>('/auth/student/forgot-password', {
    method: 'POST',
    body: payload,
  })
}

export function resetStudentPassword(payload: ResetPasswordPayload) {
  return apiRequest<MessageResponse>('/auth/student/reset-password', {
    method: 'POST',
    body: payload,
  })
}
