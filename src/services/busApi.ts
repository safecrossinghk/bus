import { BusStop, RouteInfo, RouteStopItem, EtaItem } from '../types';

const KMB_BASE = 'https://data.etabus.gov.hk/v1/transport/kmb';
const CTB_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';

let kmbStopsCache: Map<string, BusStop> | null = null;
let kmbStopsListCache: BusStop[] | null = null;
let kmbRoutesCache: RouteInfo[] | null = null;
const ctbStopCache = new Map<string, BusStop>();

export async function getKmbStops(): Promise<BusStop[]> {
  if (kmbStopsListCache && kmbStopsListCache.length > 0) {
    return kmbStopsListCache;
  }

  // Try checking IndexedDB/sessionStorage
  try {
    const stored = sessionStorage.getItem('kmb_stops_cache');
    if (stored) {
      const parsed = JSON.parse(stored) as BusStop[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        kmbStopsListCache = parsed;
        kmbStopsCache = new Map(parsed.map(s => [s.stop, s]));
        return parsed;
      }
    }
  } catch {
    // ignore sessionStorage read error
  }

  try {
    const res = await fetch(`${KMB_BASE}/stop`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list: BusStop[] = (json.data || []).map((item: any) => ({
      stop: item.stop,
      name_tc: item.name_tc || '',
      name_en: item.name_en || '',
      name_sc: item.name_sc || '',
      lat: parseFloat(item.lat),
      long: parseFloat(item.long),
      company: 'KMB' as const,
    }));

    kmbStopsListCache = list;
    kmbStopsCache = new Map(list.map(s => [s.stop, s]));

    // Cache light version in session if possible (or keep in memory)
    try {
      // Store in memory is primary, session storage fallback
      if (list.length > 0) {
        sessionStorage.setItem('kmb_stops_cache', JSON.stringify(list.slice(0, 3000)));
      }
    } catch {
      // quota exceeded, skip
    }

    return list;
  } catch (err) {
    console.error('Failed to fetch KMB stops:', err);
    throw err;
  }
}

export async function getKmbStopById(stopId: string): Promise<BusStop | null> {
  const cleanId = stopId.trim().toUpperCase();
  if (kmbStopsCache && kmbStopsCache.has(cleanId)) {
    return kmbStopsCache.get(cleanId)!;
  }

  try {
    const res = await fetch(`${KMB_BASE}/stop/${cleanId}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data || !json.data.stop) return null;

    const stop: BusStop = {
      stop: json.data.stop,
      name_tc: json.data.name_tc || '',
      name_en: json.data.name_en || '',
      name_sc: json.data.name_sc || '',
      lat: parseFloat(json.data.lat),
      long: parseFloat(json.data.long),
      company: 'KMB',
    };

    if (!kmbStopsCache) kmbStopsCache = new Map();
    kmbStopsCache.set(stop.stop, stop);
    return stop;
  } catch {
    return null;
  }
}

export async function getKmbRoutes(): Promise<RouteInfo[]> {
  if (kmbRoutesCache) return kmbRoutesCache;

  try {
    const res = await fetch(`${KMB_BASE}/route/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list: RouteInfo[] = (json.data || []).map((item: any) => ({
      route: item.route,
      bound: item.bound === 'I' ? 'I' : 'O',
      service_type: String(item.service_type || '1'),
      orig_tc: item.orig_tc || '',
      orig_en: item.orig_en || '',
      dest_tc: item.dest_tc || '',
      dest_en: item.dest_en || '',
      company: 'KMB' as const,
    }));
    kmbRoutesCache = list;
    return list;
  } catch (err) {
    console.error('Failed to fetch KMB routes:', err);
    return [];
  }
}

export async function getKmbRouteStops(route: string, bound: 'O' | 'I', serviceType = '1'): Promise<RouteStopItem[]> {
  const dir = bound === 'O' ? 'outbound' : 'inbound';
  const url = `${KMB_BASE}/route-stop/${encodeURIComponent(route.toUpperCase())}/${dir}/${serviceType}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load route stops: HTTP ${res.status}`);
  const json = await res.json();
  const rawList = json.data || [];

  // Ensure stops are cached to fill names
  if (!kmbStopsCache) {
    await getKmbStops().catch(() => {});
  }

  return rawList.map((item: any) => {
    const stopObj = kmbStopsCache?.get(item.stop);
    return {
      seq: parseInt(item.seq, 10),
      stop: item.stop,
      name_tc: stopObj?.name_tc || item.name_tc || `站點 ${item.stop}`,
      name_en: stopObj?.name_en || item.name_en || '',
      lat: stopObj?.lat,
      long: stopObj?.long,
      company: 'KMB' as const,
    };
  });
}

export async function getKmbStopEta(stopId: string): Promise<EtaItem[]> {
  const cleanId = stopId.trim().toUpperCase();
  const res = await fetch(`${KMB_BASE}/stop-eta/${cleanId}`);
  if (!res.ok) throw new Error(`Failed to fetch ETA: HTTP ${res.status}`);
  const json = await res.json();
  return (json.data || []).map((item: any) => ({
    co: item.co || 'KMB',
    route: item.route,
    dir: item.dir,
    service_type: item.service_type,
    seq: item.seq,
    dest_tc: item.dest_tc || item.dest_en || '',
    dest_en: item.dest_en || '',
    eta: item.eta,
    eta_seq: item.eta_seq,
    rmk_tc: item.rmk_tc || '',
    rmk_en: item.rmk_en || '',
    data_timestamp: item.data_timestamp,
  }));
}

export async function getCtbStopBatchEta(stopId: string): Promise<{ etas: EtaItem[]; rawJson: any; timestamp: string }> {
  const cleanId = stopId.trim();
  const url = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${cleanId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Citybus API returned HTTP ${res.status}`);
  const json = await res.json();
  const rawList = json.data || [];

  const etas: EtaItem[] = rawList.map((item: any) => ({
    co: item.co || 'CTB',
    route: item.route,
    dir: item.dir,
    seq: item.seq,
    dest_tc: item.dest || item.dest_en || '',
    dest_en: item.dest || item.dest_en || '',
    eta: item.eta,
    eta_seq: item.eta_seq,
    rmk_tc: item.rmk || '',
    rmk_en: item.rmk || '',
    routeVariantName: item.routeVariantName,
    departed: item.departed,
    noGPS: item.noGPS,
    wheelChair: item.wheelChair,
    data_timestamp: item.data_timestamp,
  }));

  return { etas, rawJson: json, timestamp: json.generated_timestamp || '' };
}

export async function getNlbStopBatchEta(stopId: string): Promise<{ etas: EtaItem[]; rawJson: any; timestamp: string }> {
  const cleanId = stopId.trim();
  const url = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/NLB/${cleanId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NLB API returned HTTP ${res.status}`);
  const json = await res.json();
  const rawList = json.data || [];

  const etas: EtaItem[] = rawList.map((item: any) => ({
    co: item.co || 'NLB',
    route: item.route,
    dir: item.dir,
    seq: item.seq,
    dest_tc: item.dest || item.dest_en || '',
    dest_en: item.dest || item.dest_en || '',
    eta: item.eta,
    eta_seq: item.eta_seq,
    rmk_tc: item.rmk || '',
    rmk_en: item.rmk || '',
    routeVariantName: item.routeVariantName,
    departed: item.departed,
    noGPS: item.noGPS,
    wheelChair: item.wheelChair,
    data_timestamp: item.data_timestamp,
  }));

  return { etas, rawJson: json, timestamp: json.generated_timestamp || '' };
}

// Master Unified Stop ETA query
export async function fetchStopAllRoutesEta(
  stopId: string,
  companyPref: 'AUTO' | 'KMB' | 'CTB' | 'NLB' = 'AUTO'
): Promise<import('../types').UnifiedStopEtaResult> {
  const cleanId = stopId.trim();
  const startTime = performance.now();

  let targetCompany: 'KMB' | 'CTB' | 'NLB' = 'KMB';
  if (companyPref === 'AUTO') {
    const format = identifyStopIdFormat(cleanId);
    targetCompany = format === 'CTB' ? 'CTB' : 'KMB';
  } else {
    targetCompany = companyPref;
  }

  // Helper to attempt KMB
  const tryKmb = async () => {
    const apiUrl = `${KMB_BASE}/stop-eta/${cleanId.toUpperCase()}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`KMB HTTP ${res.status}`);
    const rawJson = await res.json();
    const etas: EtaItem[] = (rawJson.data || []).map((item: any) => ({
      co: item.co || 'KMB',
      route: item.route,
      dir: item.dir,
      service_type: item.service_type,
      seq: item.seq,
      dest_tc: item.dest_tc || item.dest_en || '',
      dest_en: item.dest_en || '',
      eta: item.eta,
      eta_seq: item.eta_seq,
      rmk_tc: item.rmk_tc || '',
      rmk_en: item.rmk_en || '',
      data_timestamp: item.data_timestamp,
    }));

    // Also get stop metadata
    const stopInfo = await getKmbStopById(cleanId).catch(() => null);
    const stop: BusStop = stopInfo || {
      stop: cleanId.toUpperCase(),
      name_tc: `九巴站點 ${cleanId}`,
      name_en: '',
      lat: 22.3193,
      long: 114.1694,
      company: 'KMB',
    };

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      stop,
      etas,
      apiUrl,
      provider: '九巴開放數據平台 (ETABUS / DATA.GOV.HK)',
      generatedTime: rawJson.generated_timestamp,
      latencyMs,
      rawJson,
    };
  };

  // Helper to attempt Citybus
  const tryCtb = async () => {
    const apiUrl = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${cleanId}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Citybus HTTP ${res.status}`);
    const rawJson = await res.json();
    const rawList = rawJson.data || [];
    const etas: EtaItem[] = rawList.map((item: any) => ({
      co: item.co || 'CTB',
      route: item.route,
      dir: item.dir,
      seq: item.seq,
      dest_tc: item.dest || item.dest_en || '',
      dest_en: item.dest || item.dest_en || '',
      eta: item.eta,
      eta_seq: item.eta_seq,
      rmk_tc: item.rmk || '',
      rmk_en: item.rmk || '',
      routeVariantName: item.routeVariantName,
      departed: item.departed,
      noGPS: item.noGPS,
      wheelChair: item.wheelChair,
      data_timestamp: item.data_timestamp,
    }));

    const stopInfo = await getCtbStopById(cleanId).catch(() => null);
    const stop: BusStop = stopInfo || {
      stop: cleanId,
      name_tc: `城巴站點 ${cleanId}`,
      name_en: '',
      lat: 22.281,
      long: 114.158,
      company: 'CTB',
    };

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      stop,
      etas,
      apiUrl,
      provider: '香港政府資料一線通 (DATA.GOV.HK) 城巴批次 API',
      generatedTime: rawJson.generated_timestamp,
      latencyMs,
      rawJson,
    };
  };

  // Helper to attempt NLB
  const tryNlb = async () => {
    const apiUrl = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/NLB/${cleanId}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`NLB HTTP ${res.status}`);
    const rawJson = await res.json();
    const rawList = rawJson.data || [];
    const etas: EtaItem[] = rawList.map((item: any) => ({
      co: item.co || 'NLB',
      route: item.route,
      dir: item.dir,
      seq: item.seq,
      dest_tc: item.dest || item.dest_en || '',
      dest_en: item.dest || item.dest_en || '',
      eta: item.eta,
      eta_seq: item.eta_seq,
      rmk_tc: item.rmk || '',
      rmk_en: item.rmk || '',
      data_timestamp: item.data_timestamp,
    }));

    const stop: BusStop = {
      stop: cleanId,
      name_tc: `新大嶼山巴士站 ${cleanId}`,
      name_en: `NLB Stop ${cleanId}`,
      lat: 22.254,
      long: 113.863,
      company: 'NLB',
    };

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      stop,
      etas,
      apiUrl,
      provider: '香港政府資料一線通 (DATA.GOV.HK) 嶼巴 API',
      generatedTime: rawJson.generated_timestamp,
      latencyMs,
      rawJson,
    };
  };

  if (targetCompany === 'KMB') {
    try {
      return await tryKmb();
    } catch (kmbErr) {
      if (companyPref === 'AUTO') {
        try {
          return await tryCtb();
        } catch {
          throw kmbErr;
        }
      }
      throw kmbErr;
    }
  } else if (targetCompany === 'CTB') {
    try {
      return await tryCtb();
    } catch (ctbErr) {
      if (companyPref === 'AUTO') {
        try {
          return await tryKmb();
        } catch {
          throw ctbErr;
        }
      }
      throw ctbErr;
    }
  } else {
    return await tryNlb();
  }
}

// Citybus helpers
export async function getCtbStopById(stopId: string): Promise<BusStop | null> {
  const cleanId = stopId.trim();
  if (ctbStopCache.has(cleanId)) return ctbStopCache.get(cleanId)!;

  try {
    const res = await fetch(`${CTB_BASE}/stop/${cleanId}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data || !json.data.stop) return null;

    const stop: BusStop = {
      stop: json.data.stop,
      name_tc: json.data.name_tc || '',
      name_en: json.data.name_en || '',
      name_sc: json.data.name_sc || '',
      lat: parseFloat(json.data.lat),
      long: parseFloat(json.data.long),
      company: 'CTB',
    };
    ctbStopCache.set(cleanId, stop);
    return stop;
  } catch {
    return null;
  }
}

export async function getCtbRouteStops(route: string, bound: 'O' | 'I'): Promise<RouteStopItem[]> {
  const dir = bound === 'O' ? 'outbound' : 'inbound';
  const url = `${CTB_BASE}/route-stop/CTB/${encodeURIComponent(route.toUpperCase())}/${dir}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load Citybus route stops: HTTP ${res.status}`);
  const json = await res.json();
  const rawList = json.data || [];

  // Fetch stop details in parallel with limit
  const results: RouteStopItem[] = [];
  for (const item of rawList) {
    const stopInfo = await getCtbStopById(item.stop);
    results.push({
      seq: item.seq,
      stop: item.stop,
      name_tc: stopInfo?.name_tc || `城巴站 ${item.stop}`,
      name_en: stopInfo?.name_en || '',
      lat: stopInfo?.lat,
      long: stopInfo?.long,
      company: 'CTB',
    });
  }
  return results;
}

export async function getCtbEta(stopId: string, route: string): Promise<EtaItem[]> {
  const url = `${CTB_BASE}/eta/CTB/${stopId.trim()}/${encodeURIComponent(route.toUpperCase())}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []).map((item: any) => ({
    co: 'CTB',
    route: item.route,
    dir: item.dir,
    seq: item.seq,
    dest_tc: item.dest_tc,
    dest_en: item.dest_en,
    eta: item.eta,
    rmk_tc: item.rmk_tc,
    rmk_en: item.rmk_en,
    data_timestamp: item.data_timestamp,
  }));
}

// Distance calculation using Haversine formula (returns meters)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Format distance nicely
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} 米`;
  }
  return `${(meters / 1000).toFixed(2)} 公里`;
}

// Detect Stop ID company type
export function identifyStopIdFormat(stopId: string): 'KMB' | 'CTB' | 'UNKNOWN' {
  const clean = stopId.trim();
  if (/^[0-9A-Fa-f]{16}$/.test(clean)) {
    return 'KMB';
  }
  if (/^\d{6}$/.test(clean)) {
    return 'CTB';
  }
  return 'UNKNOWN';
}

// Sample routes for quick clicks
export const POPULAR_ROUTES = [
  { route: '1A', company: 'KMB' as const, name: '尖沙咀碼頭 ↔ 中秀茂坪' },
  { route: '960', company: 'KMB' as const, name: '屯門建生 ↔ 灣仔北' },
  { route: '102', company: 'KMB' as const, name: '美孚 ↔ 筲箕灣 (隧巴)' },
  { route: 'B1', company: 'KMB' as const, name: '天水圍天慈 ↔ 落馬洲站' },
  { route: '681', company: 'KMB' as const, name: '馬鞍山市中心 ↔ 中環香港站' },
  { route: '268C', company: 'KMB' as const, name: '朗屏 ↔ 觀塘碼頭' },
  { route: '1', company: 'CTB' as const, name: '堅尼地城 ↔ 跑馬地' },
  { route: 'A21', company: 'CTB' as const, name: '紅磡站 ↔ 機場' },
];
