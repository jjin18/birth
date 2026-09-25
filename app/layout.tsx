import type { Metadata } from 'next';
import './globals.css';
import './panels.css';
import './scene-overlays.css';
import './fortunes.css';
import './daylight.css';
import './interior.css';
export const metadata: Metadata = { title: "Ryan's 22nd", description: 'A little place for Jia and Ryan. One room. Many cities. A lot of future.', icons: { icon: { url: '/favicon-ryan.png', type: 'image/png', sizes: '64x64' } } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
