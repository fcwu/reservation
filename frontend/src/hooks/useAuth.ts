import { useEffect, useState } from 'react'
import { api } from '../api'

export function useAuth() {
  const [auth, setAuth] = useState<{ loading: boolean; authenticated: boolean; email?: string }>({
    loading: true,
    authenticated: false,
  })

  useEffect(() => {
    api
      .getMe()
      .then((data) => setAuth({ loading: false, ...data }))
      .catch(() => setAuth({ loading: false, authenticated: false }))
  }, [])

  return auth
}
