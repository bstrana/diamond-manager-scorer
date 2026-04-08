import PocketBase from 'pocketbase';

let _pb: PocketBase | null = null;

/** Returns the singleton PocketBase client pointed at the embedded PB instance. */
export const getPbClient = (): PocketBase => {
  if (_pb) return _pb;
  const env = typeof window !== 'undefined' ? ((window as unknown) as Record<string, unknown>).__ENV__ as Record<string, string> | undefined : undefined;
  const pbUrl = env?.POCKETBASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/_pb` : '');
  _pb = new PocketBase(pbUrl);
  return _pb;
};
