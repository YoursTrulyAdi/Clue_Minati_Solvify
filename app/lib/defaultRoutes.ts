export const DEFAULT_ROUTES: Record<string, string[]> = {
  A: ["temple", "lab", "maggie", "park", "bbc"],
  B: ["park", "bbc", "lab", "temple", "maggie"],
  C: ["bbc", "maggie", "park", "lab", "temple"],
  D: ["lab", "maggie", "temple", "bbc", "park"],
  E: ["maggie", "temple", "bbc", "park", "lab"],
};

export function normalizeRouteId(routeId: string | null | undefined): string {
  return (routeId ?? "").trim().toUpperCase();
}

export function getDefaultStopsForRoute(routeId: string | null | undefined): string[] | null {
  const normalized = normalizeRouteId(routeId);
  return DEFAULT_ROUTES[normalized] ?? null;
}
