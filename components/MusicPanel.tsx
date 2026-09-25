'use client';
import Modal from './Modal';

export default function MusicPanel({close}:{close:()=>void}){
 return <Modal title="Wow working in your virtual life too." eyebrow="" close={close} className="music-panel">
  <p className="panel-description">Play some music to relax.</p>
  <iframe title="Relaxing music on Spotify" data-testid="spotify-playlist" src="https://open.spotify.com/embed/playlist/15lForQ8Rv1kFBmiqlOJKO?utm_source=generator" width="100%" height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
  <a className="music-link" href="https://open.spotify.com/playlist/15lForQ8Rv1kFBmiqlOJKO" target="_blank" rel="noopener noreferrer">Open in Spotify</a>
 </Modal>;
}
