import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
})

// Initialise l'accès à l'API Grist une seule fois, de manière synchrone,
// AVANT que React ne monte. Appeler grist.ready() depuis un useEffect
// peut déclencher un rechargement du widget par Grist, créant une boucle infinie.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
if (!USE_MOCK) {
  try {
    const g = (window as unknown as { grist?: { ready: (o?: object) => void } }).grist
    if (g) g.ready({ requiredAccess: 'full' })
  } catch {
    // Widget chargé hors Grist (preview locale, etc.) — on ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>,
)
