// Ambient globals injected by third-party scripts loaded at runtime.
//
// `window.google` is the Google Identity Services SDK (loaded from
// accounts.google.com by the sign-in / registration pages). It has no
// bundled types here — the SDK surface the app touches is small and
// tolerant, so it is typed `any` rather than modelled. See
// `src/modules/Auth/utils/google.ts` for the wrapper the pages should
// prefer; direct `window.google` reads are the legacy path.
interface Window {
  google?: any;
}
