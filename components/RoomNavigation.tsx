'use client';
import { createContext, useContext } from 'react';
import { ZoomOut } from 'lucide-react';

function KeysIcon(){return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="5" r="3.5"/><path d="M7 8v12h3v-3H7m4-9 7 11 2-1.5-2-3-2 1.5M11 5h.01"/></svg>}

type Navigation = { interior: boolean; canReset: boolean; toggle: () => void; reset: () => void };
export const RoomNavigationContext = createContext<Navigation | null>(null);

/** Also rendered inside dialogs so the native modal never makes reset inert. */
export default function RoomNavigation() {
 const navigation = useContext(RoomNavigationContext);
 if (!navigation) return null;
 return <nav className="view-controls" aria-label="Room view">
  <button className="view-toggle" aria-pressed={navigation.interior} onClick={navigation.toggle}><KeysIcon/>{navigation.interior ? 'Step outside' : 'Step inside'}</button>
  {navigation.canReset && <button className="zoom-out" aria-label="Zoom out" title="Reset room view" onClick={navigation.reset}><ZoomOut size={19} aria-hidden="true"/></button>}
 </nav>;
}
