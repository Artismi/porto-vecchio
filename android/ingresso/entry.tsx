/**
 * L'ingresso dell'APK: la pagina /porto-vecchio del sito (GamePage) fuori da Next. Lo stesso Game Boy, la stessa pulsantiera, lo
 * stesso caricamento con la scritta artismi; dentro, il gioco da /gioco/index.html come sul sito (PROGETTI.game.path), con gli
 * stessi parametri: quelli dell'indirizzo di questa pagina (nell'APK nessuno). «Esci» chiude l'app (MainActivity, PVApp.esci).
 * Compilato con esbuild dai sorgenti del sito: android/ingresso/costruisci.mjs.
 */
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GameBoy } from '@/components/ui/GameBoy'
import { PROGETTI } from '@/config/content'
import '@/app/globals.css'
import './font/font.css'
import './ingresso.css'

declare global { interface Window { PVApp?: { esci: () => void; scarico?: () => string } } }

// [tasselli] nell'APK il riquadro passa prima dalla pagina d'attesa: la prima volta si scarica la città a tasselli (MainActivity,
// Scarico) e l'avanzamento va nel caricamento del Game Boy; poi attesa.html passa a /gioco/index.html, l'indirizzo del sito
if (window.PVApp?.scarico) PROGETTI.game.path = '/attesa.html'

function GamePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  function back() { try { window.PVApp?.esci() } catch { /* fuori dall'app */ } }
  return <main>{mounted && <GameBoy page from={null} onClose={back} warm={false} />}</main>
}

createRoot(document.getElementById('pv')!).render(<GamePage />)
