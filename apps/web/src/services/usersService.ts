import { http } from '../api/http'
import type { Me } from '../state/authStore'

export const usersService = {
  list(q?: string) {
    const url = q ? `/users?q=${encodeURIComponent(q)}` : '/users'
    return http<Array<Pick<Me, 'id' | 'username' | 'displayName' | 'email' | 'role'>>>(url)
  },
}
