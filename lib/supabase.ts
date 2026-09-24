import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key):null;
export async function recordBedClick(){if(!supabase)return false;const {error}=await supabase.functions.invoke('bed-click');if(error)throw error;return true}
export async function uploadImage(file:Blob,name:string){if(!supabase)throw Error('The shared wall is not connected yet.');const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in to save to the shared wall.');const ext=file.type==='image/png'?'png':'jpg';const path=`${user.id}/${crypto.randomUUID()}-${name}.${ext}`;const {error}=await supabase.storage.from('memories').upload(path,file,{contentType:file.type});if(error)throw error;return path;}
export async function imageUrl(path:string){if(!supabase||!path)return path;const {data,error}=await supabase.storage.from('memories').createSignedUrl(path,3600);if(error)throw error;return data.signedUrl;}
