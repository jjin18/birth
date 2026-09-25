// Shared by the main floor and the extended interior, without extra textures.
export const floorPlankColors=['#b0aaa1','#bbb4aa','#b5aea6','#a8a39a','#bdb6ac'] as const;
export const floorBaseColor='#827b72';
export function tintFloorShader(shader:{fragmentShader:string}){
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  // A smoked-oak grey wash; retain the original grain and bump map.
  float floorLuminance=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
  diffuseColor.rgb=mix(vec3(floorLuminance),diffuseColor.rgb,0.45);
 `);
}
export const floorProgramKey=()=> 'smoked-grey-oak-v1';

export const keyboardColors={case:'#1e2024',modifier:'#343b46',key:'#79818d',space:'#9098a5',accent:'#e3403b'} as const;
export function keyboardKeyColor(row:number,column:number){
 if((row===0&&column===0)||(row===2&&column===13))return keyboardColors.accent;
 return row===0||column<2||column>11?keyboardColors.modifier:keyboardColors.key;
}
