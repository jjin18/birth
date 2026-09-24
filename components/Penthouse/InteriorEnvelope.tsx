import { RoundedBox } from '@react-three/drei';
import { Surface } from './Materials';
import { ROOM_HEIGHT } from '@/lib/room-camera';
import { INTERIOR_WINDOW_TOP } from '@/lib/room-dimensions';

export default function InteriorEnvelope(){return <group name="interior-shell">
 <mesh name="ceiling" position={[0,ROOM_HEIGHT+.08,9.5]} receiveShadow><boxGeometry args={[10.2,.16,26]}/><Surface color="#d7d5cb"/></mesh>
 <mesh position={[5.04,ROOM_HEIGHT/2,9.5]} receiveShadow><boxGeometry args={[.18,ROOM_HEIGHT,26]}/><Surface color="#b9b9ae"/></mesh>
 <mesh position={[-5,ROOM_HEIGHT/2,13]} receiveShadow><boxGeometry args={[.18,ROOM_HEIGHT,19]}/><Surface color="#b9b9ae"/></mesh>
 <mesh position={[-5,(ROOM_HEIGHT+3.4)/2,0]} receiveShadow><boxGeometry args={[.18,ROOM_HEIGHT-3.4,7]}/><Surface color="#b9b9ae"/></mesh>
 <mesh position={[0,(ROOM_HEIGHT+INTERIOR_WINDOW_TOP)/2,-3.43]} receiveShadow><boxGeometry args={[10,ROOM_HEIGHT-INTERIOR_WINDOW_TOP,.18]}/><Surface color="#b9b9ae"/></mesh>
 {Array.from({length:25},(_,i)=><group key={i}>{Array.from({length:8},(_,j)=><mesh key={j} position={[-4.8+i*.4,.06,4.67+j*2.34]} receiveShadow><boxGeometry args={[.385,.025,2.325]}/><Surface color={['#93704f','#a07d58','#ab815a','#9e7550','#ad865d'][(i+j*2)%5]} kind="wood"/></mesh>)}</group>)}
 {[-4.9,4.925].map(x=><group key={x}><RoundedBox position={[x,.19,9.5]} args={[.055,.22,25.9]} radius={.008} smoothness={2}><Surface color="#d5d2c6"/></RoundedBox><RoundedBox position={[x,ROOM_HEIGHT-.1,9.5]} args={[.2,.13,25.9]} radius={.01} smoothness={2}><Surface color="#d5d2c6"/></RoundedBox></group>)}
 <RoundedBox position={[0,ROOM_HEIGHT-.1,-3.32]} args={[10,.13,.2]} radius={.01} smoothness={2}><Surface color="#d5d2c6"/></RoundedBox>
</group>}
