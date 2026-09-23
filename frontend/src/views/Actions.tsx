import React, { useState } from 'react'
import { motion } from "framer-motion"
import { Tag, CheckSquare, CalendarDays, ListTodo } from 'lucide-react'
import Calendar from './actions/Calendar'
import Categories from './actions/Categories'
import ByStatus from './actions/ByStatus'
import MyTasks from './actions/MyTasks'

type ViewMode = 'Categories' | 'ByStatus' | 'Calendrier' | 'MyTasks'

const MODES: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'Categories', label: 'Par catégorie',  icon: <Tag size={13} /> },
    { mode: 'ByStatus',     label: 'Par statut',      icon: <CheckSquare size={13} /> },
    { mode: 'Calendrier', label: 'Calendrier',  icon: <CalendarDays size={13} /> },
    { mode: 'MyTasks', label: 'Mes tâches',  icon: <ListTodo size={13} /> },
]

export default function Actions() {
    const [viewMode, setViewMode] = useState<ViewMode>('Categories')

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-6 py-1 shrink-0">
                <div className="bg-gray-200 rounded-full border p-1 flex relative">
                    {MODES.map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`relative flex items-center gap-1.5 px-4 py-1 rounded-full text-sm z-10 transition-colors duration-300 ${viewMode === mode ? 'text-white' : 'text-black'}`}
                        >
                            <span className="relative z-20 flex items-center gap-1.5">
                                {icon}{label}
                            </span>
                            {viewMode === mode && (
                                <motion.div
                                    layoutId="activeActionTab"
                                    className="absolute inset-0 bg-black rounded-full z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 ml-[30px] flex flex-col overflow-auto">
                {viewMode === 'Categories'  && <Categories />}
                {viewMode === 'ByStatus'      && <ByStatus />}
                {viewMode === 'Calendrier'  && <Calendar />}
                {viewMode === 'MyTasks'  && <MyTasks />}

            </div>
        </div>
    )
}