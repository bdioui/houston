import { createContext, useContext } from 'react'
import type { MemberFull } from '@/lib/types'

export const UserContext = createContext<MemberFull | null>(null)
export const useCurrentUser = () => useContext(UserContext)