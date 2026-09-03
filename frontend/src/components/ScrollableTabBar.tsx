import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ScrollableTabBar({ children }: { children: React.ReactNode }) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft,  setCanScrollLeft]  = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const checkScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setCanScrollLeft(el.scrollLeft > 1)
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }, [])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        checkScroll()
        el.addEventListener('scroll', checkScroll, { passive: true })
        const ro = new ResizeObserver(checkScroll)
        ro.observe(el)
        return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
    }, [checkScroll])

    function scroll(dir: 'left' | 'right') {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
    }

    return (
        <div className="flex items-center">
            <button
                onClick={() => scroll('left')}
                className={`shrink-0 p-1 rounded transition-all ${canScrollLeft ? 'text-muted-foreground hover:text-foreground' : 'invisible pointer-events-none'}`}
            >
                <ChevronLeft size={14} />
            </button>

            <div
                ref={scrollRef}
                className="flex-1 flex relative overflow-x-auto items-center
                    [&::-webkit-scrollbar]:h-[3px]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-border
                    [&::-webkit-scrollbar-track]:bg-transparent"
            >
                {children}
            </div>

            <button
                onClick={() => scroll('right')}
                className={`shrink-0 p-1 rounded transition-all ${canScrollRight ? 'text-muted-foreground hover:text-foreground' : 'invisible pointer-events-none'}`}
            >
                <ChevronRight size={14} />
            </button>
        </div>
    )
}
