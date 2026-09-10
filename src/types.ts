export type BusCompany = 'KMB' | 'CTB' | 'NLB' | 'ALL';

export interface BusStop {
  stop: string; // The STOP ID
  name_tc: string;
  name_en: string;
  name_sc?: string;
  lat: number;
  long: number;
  company: 'KMB' | 'CTB' | 'NLB';
  distance?: number; // distance in meters if calculated
}

export interface RouteInfo {
  route: string;
  bound: 'O' | 'I'; // O = Outbound, I = Inbound
  service_type: string;
  orig_tc: string;
  orig_en: string;
  dest_tc: string;
  dest_en: string;
  company: 'KMB' | 'CTB' | 'NLB';
}

export interface RouteStopItem {
  seq: number;
  stop: string; // STOP ID
  name_tc?: string;
  name_en?: string;
  lat?: number;
  long?: number;
  company: 'KMB' | 'CTB' | 'NLB';
}

export interface EtaItem {
  co: string;
  route: string;
  dir?: string;
  service_type?: number | string;
  seq?: number;
  dest_tc: string;
  dest_en: string;
  eta: string | null;
  eta_seq?: number;
  rmk_tc?: string;
  rmk_en?: string;
  routeVariantName?: string | null;
  departed?: number | null;
  noGPS?: number | null;
  wheelChair?: number | null;
  data_timestamp?: string;
}

export interface UnifiedStopEtaResult {
  stop: BusStop;
  etas: EtaItem[];
  apiUrl: string;
  provider: string;
  generatedTime?: string;
  latencyMs: number;
  rawJson?: any;
}

export interface SavedStop {
  id: string;
  stopId: string;
  name_tc: string;
  name_en: string;
  company: 'KMB' | 'CTB' | 'NLB';
  note?: string;
  savedAt: number;
}

export interface UserTrackedConfig {
  stopId: string;
  stopName_tc: string;
  stopName_en?: string;
  company: 'KMB' | 'CTB' | 'NLB';
  selectedRoutes: string[];
  selectedRouteKeys: string[]; // "route||dest_tc"
  lastConfiguredAt: number;
}

