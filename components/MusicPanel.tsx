'use client';
import Modal from './Modal';

export default function MusicPanel({close,open=true}:{close:()=>void;open?:boolean}){
 return <Modal title="Here's some music to help you with work." eyebrow="" close={close} open={open} className="music-panel" ariaLabel="Music player">
  <iframe title="Relaxing music on Spotify" data-testid="spotify-playlist" src="https://open.spotify.com/embed/playlist/15lForQ8Rv1kFBmiqlOJKO?utm_source=generator" width="100%" height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
  <a className="music-link" href="https://open.spotify.com/playlist/15lForQ8Rv1kFBmiqlOJKO" target="_blank" rel="noopener noreferrer">Open in Spotify</a>
  <p className="music-persistence-note">Music stays on when you close this window. Pause it in the player.</p>
 </Modal>;
}
