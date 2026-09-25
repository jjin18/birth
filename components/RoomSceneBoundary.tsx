'use client';
import { Component, type ReactNode } from 'react';

/** A failed model or unavailable WebGL should show recovery, not an endless key. */
export default class RoomSceneBoundary extends Component<{children:ReactNode;onReady:()=>void},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(){this.props.onReady()}
 render(){
  if(this.state.failed)return <div className="loading" role="alert"><p>The room couldn’t load. Please refresh to try again.</p><button className="view-toggle" onClick={()=>window.location.reload()}>Reload room</button></div>;
  return this.props.children;
 }
}
