import type { CSSProperties } from 'react';
import type { SavedFortune } from '@/lib/fortunes';
import FortuneSlip from './FortuneSlip';

const crumbs=[
 [-105,44,-145,8],[-77,57,100,11],[-51,38,-210,7],[-25,63,135,6],
 [23,51,220,9],[49,68,-160,7],[79,40,170,10],[108,59,-240,6],
];
export default function FortuneCrack({note}:{note:SavedFortune}){
 return <div className="fortune-reveal fortune-crack">
  <div className="cookie-crack-stage">
   <div className="cookie-half cookie-half-left"><img src="/textures/fortune-cookie.png" alt="Golden baked fortune cookie" width={800} height={696}/></div>
   <div className="cookie-half cookie-half-right" aria-hidden="true"><img src="/textures/fortune-cookie.png" alt="" width={800} height={696}/></div>
   <div className="cookie-crumbs" aria-hidden="true">{crumbs.map(([x,y,spin,size],i)=><span key={i} className="cookie-crumb" style={{'--crumb-x':x+'px','--crumb-y':y+'px','--crumb-spin':spin+'deg','--crumb-size':size+'px','--crumb-delay':(.32+i*.025)+'s'} as CSSProperties}><img src="/textures/fortune-cookie.png" alt=""/></span>)}</div>
  </div>
  <div className="cookie-unfolding-paper"><FortuneSlip note={note}/></div>
 </div>;
}
