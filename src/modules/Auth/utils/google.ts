export function loadGsiScript(): Promise<void> {
  const g = (): any => (typeof window !== "undefined" ? (window as any).google : undefined);
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (g()?.accounts?.id) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (g()?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener("load", () =>
        g()?.accounts?.id ? resolve() : reject(new Error("Google script failed")),
      );
      existing.addEventListener("error", () => reject(new Error("Google script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(s);
  });
}
