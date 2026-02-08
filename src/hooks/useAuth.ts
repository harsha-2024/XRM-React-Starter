
import { useSelector, useDispatch } from 'react-redux'
import { RootState, loginSuccess, logout as doLogout } from '@/store'

export function useAuth() {
  const auth = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch()

  function login(username: string, password: string) {
    const role = username === 'admin' ? 'admin' : username === 'support' ? 'support' : 'sales'
    const token = `mock-jwt-${Date.now()}`
    dispatch(loginSuccess({ user: { username, role }, token }))
  }

  function logout() { dispatch(doLogout()) }

  function userHasRole(roles: string[]) { return roles.includes(auth.user?.role ?? '') }

  return { ...auth, login, logout, isAuthenticated: !!auth.token, userHasRole }
}
