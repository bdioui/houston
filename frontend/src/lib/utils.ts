import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
    const escape = (v: string | number | null | undefined) => {
        const s = v == null ? '' : String(v)
        return s.includes(';') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
    }
    const lines = [headers, ...rows].map(row => row.map(escape).join(';'))
    const csv = '﻿' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
