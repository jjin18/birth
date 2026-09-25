import versions from './asset-versions.json';
/** Persistent uploads and external URLs are deliberately not fingerprinted. */
export function assetUrl(path: string) {
  const version = (versions as Record<string,string>)[path];
  return version ? `${path}?v=${version}` : path;
}
