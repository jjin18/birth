import type { Metadata } from 'next';
import './globals.css';
import './panels.css';
import './scene-overlays.css';
import './fortunes.css';
export const metadata: Metadata = { title: 'Penthouse 22 · One room. Many cities.', description: 'A little place for Jia and Ryan. One room. Many cities. A lot of future.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
