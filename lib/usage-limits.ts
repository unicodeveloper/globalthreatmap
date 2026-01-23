const STORAGE_KEY = "globalthreatmap_usage";

interface UsageData {
  eventLoads: number;
  countryClicks: number;
}

const LIMITS = {
  eventLoads: 5,
  countryClicks: 2,
};

function getUsageData(): UsageData {
  if (typeof window === "undefined") {
    return { eventLoads: 0, countryClicks: 0 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { eventLoads: 0, countryClicks: 0 };
}

function saveUsageData(data: UsageData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function incrementEventLoads(): number {
  const data = getUsageData();
  data.eventLoads += 1;
  saveUsageData(data);
  return data.eventLoads;
}

export function incrementCountryClicks(): number {
  const data = getUsageData();
  data.countryClicks += 1;
  saveUsageData(data);
  return data.countryClicks;
}

export function hasReachedLimit(): boolean {
  const data = getUsageData();
  return data.eventLoads >= LIMITS.eventLoads || data.countryClicks >= LIMITS.countryClicks;
}

export function getUsageCounts(): UsageData {
  return getUsageData();
}

export function clearUsage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
