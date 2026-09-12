export const DOCUSIGN_DASHBOARD_RETURN_PARAM = "q2bDocuSignReturn";

export const ZIPCODE_NOT_AVAILABLE_MSG = "Not data avaliable for this zipcode";

export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  const raw =
    e && typeof e === "object" && "message" in e ? (e as { message?: unknown }).message : undefined;
  return new Error(raw ? String(raw) : String(e));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getDocuSignDashboardReturnUrl(): string {
  if (typeof window === "undefined") return `/?${DOCUSIGN_DASHBOARD_RETURN_PARAM}=dashboard`;

  const url = new URL(window.location.href);
  url.searchParams.set(DOCUSIGN_DASHBOARD_RETURN_PARAM, "dashboard");
  return `${url.pathname}${url.search}${url.hash}`;
}
