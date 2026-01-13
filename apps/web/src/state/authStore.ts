const TOKEN_KEY = 'program_access_token'

export type Me = {
  id: string
  username: string
  displayName: string | null
  email: string | null
  role: 'USER' | 'ADMIN'
}

let cachedToken: string | null = localStorage.getItem(TOKEN_KEY)

export function getToken() {
  return cachedToken
}

export function setToken(token: string) {
  cachedToken = token
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  cachedToken = null
  localStorage.removeItem(TOKEN_KEY)
}
