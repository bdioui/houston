import { createContext, useContext } from 'react'
import type { MemberFull, Program } from '@/lib/types'

export const UserContext = createContext<MemberFull | null>(null)
export const useCurrentUser = () => useContext(UserContext)

// Le programme actif, celui que la session Django impose à toutes les requêtes.
// Par contexte et non par `getProgram()[0]` : la liste rend désormais tous les
// programmes de l'utilisateur, et son premier élément n'a aucune raison d'être
// celui dans lequel on travaille — une vue qui le lisait affichait le budget
// d'un programme sous les dépenses d'un autre.
export const ProgramContext = createContext<Program | null>(null)
export const useCurrentProgram = () => useContext(ProgramContext)