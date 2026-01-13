import { http } from '../api/http'
import type { Me } from '../state/authStore'

export const authService = {
  login(username: string, password: string) {
    return http<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  me() {
    return http<Me>('/auth/me')
  },
}
