'use client';
import { createContext, useContext } from 'react';
import { ScanEye, ZoomOut } from 'lucide-react';

type Navigation = { interior: boolean; canReset: boolean; toggle: () => void; reset: () => void };
export const RoomNavigationContext = createContext<Navigation | null>(null);

/** Also rendered inside dialogs so the native modal never makes reset inert. */
export default function RoomNavigation() {
 const navigation = useContext(RoomNavigationContext);
 if (!navigation) return null;
 return <nav className="view-controls" aria-label="Room view">
  <button className="view-toggle" aria-pressed={navigation.interior} onClick={navigation.toggle}><ScanEye size={15}/>{navigation.interior ? 'Step outside' : 'Step inside'}</button>
  {navigation.canReset && <button className="zoom-out" aria-label="Zoom out" title="Reset room view" onClick={navigation.reset}><ZoomOut size={19} aria-hidden="true"/></button>}
 </nav>;
}
