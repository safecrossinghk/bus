import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Hash,
  Search,
  Bus,
  Clock,
  RefreshCw,
  MapPin,
  Bookmark,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Code2,
  Copy,
  Check,
  Sparkles,
  Wifi,
  Calendar,
  Layers,
  ListOrdered,
  Maximize2
} from 'lucide-react';
import { BusStop, EtaItem, SavedStop, UnifiedStopEtaResult } from '../types';
import { fetchStopAllRoutesEta, identifyStopIdFormat } from '../services/busApi';
import { CopyButton } from './CopyButton';
import { StopMap } from './StopMap';

interface StopEtaLookupProps {
  initialStopId?: string;
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB' | 'NLB') => void;
  onNavigateToRouteSearch?: () => void;
}

const FEATURED_STOPS = [
  { id: 'A3ADFCDF8487ADB9', label: '尖沙咀碼頭總站', company: 'KMB' as const, desc: '九巴 1, 1A, 2, 5, 6, 7 等' },
  { id: '001032', label: '中環 (交易廣場)', company: 'CTB' as const, desc: '城巴 12, 15 (往山頂), 70, 260 等' },
  { id: '37E5DC7023190C67', label: '屯門市中心總站', company: 'KMB' as const, desc: '九巴 58M, 60M, 60X, 263, 961 等' },
  { id: 'C8E7EAC13627040D', label: '沙田市中心總站', company: 'KMB' as const, desc: '九巴 48X, 49X, 81, 88K, 89 等' },
  { id: '001044', label: '上環德輔道中林士街', company: 'CTB' as const, desc: '城巴 1, 101, 111, 115 等' },
  { id: '4EB9AC6D0254CFD9', label: '美孚轉車站', company: 'KMB' as const, desc: '九巴 6, 30X, 102 等' },
  { id: '18492910339410B1', label: '竹園邨總站', company: 'KMB' as const, desc: '九巴 1, 2B, 11C, 103 等' },
  { id: '001001', label: '中環亞畢諾道中央廣場', company: 'CTB' as const, desc: '城巴 12, 13 等' },
  { id: '1', label: '大澳總站', company: 'NLB' as const, desc: '嶼巴 1, 11, 21 等' },
];

export const StopEtaLookup: React.FC<StopEtaLookupProps> = ({
  initialStopId = 'A3ADFCDF8487ADB9',
  savedStops,
  onToggleSave,
}) => {
  const [stopInput, setStopInput] = useState(initialStopId);
  const [companyPref, setCompanyPref] = useState<'AUTO' | 'KMB' | 'CTB' | 'NLB'>('AUTO');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result data
  const [result, setResult] = useState<UnifiedStopEtaResult | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-refresh controls
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // Filter & view mode
  const [filterKeyword, setFilterKeyword] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'SOON' | 'TEN'>('ALL');
  const [viewMode, setViewMode] = useState<'ROUTE' | 'TIMELINE'>('ROUTE');
  const [showMap, setShowMap] = useState(false);
  const [showApiInspector, setShowApiInspector] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Current query execution
  const executeQuery = async (idToQuery: string, compPref = companyPref) => {
    const cleanId = idToQuery.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetchStopAllRoutesEta(cleanId, compPref);
      setResult(res);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch (err: any) {
      console.error('Failed to fetch stop ETA:', err);
      setErrorMsg(
        err.message ||
          `無法從政府/巴士公司 API 取得 STOP ID「${cleanId}」的資料。請確認站點代號或營運公司是否正確。`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initial lookup on mount
  useEffect(() => {
    if (initialStopId) {
      executeQuery(initialStopId);
    }
  }, []);

  // Auto-refresh timer loop
  useEffect(() => {
    if (!autoRefresh || !result) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger refresh silently
          if (result) {
            executeQuery(result.stop.stop, companyPref);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, result, companyPref]);

  // Compute minutes difference
  const getEtaMinutes = (etaString: string | null) => {
    if (!etaString) return null;
    const etaTime = new Date(etaString);
    const now = new Date();
    const diffMs = etaTime.getTime() - now.getTime();
    return Math.round(diffMs / 60000);
  };

  // Group ETA items by route
  const groupedRoutes = useMemo(() => {
    if (!result || !result.etas) return [];

    const map = new Map<
      string,
      {
        route: string;
        dest_tc: string;
        dest_en: string;
        dir?: string;
        seq?: number;
        co: string;
        departures: EtaItem[];
        earliestMinutes: number | null;
      }
    >();

    result.etas.forEach((item) => {
      const key = `${item.route}-${item.dir || 'X'}-${item.dest_tc || item.dest_en}`;
      const minutes = getEtaMinutes(item.eta);

      if (!map.has(key)) {
        map.set(key, {
          route: item.route,
          dest_tc: item.dest_tc,
          dest_en: item.dest_en,
          dir: item.dir,
          seq: item.seq,
          co: item.co,
          departures: [item],
          earliestMinutes: minutes,
        });
      } else {
        const group = map.get(key)!;
        group.departures.push(item);
        if (
          minutes !== null &&
          (group.earliestMinutes === null || minutes < group.earliestMinutes)
        ) {
          group.earliestMinutes = minutes;
        }
      }
    });

    let list = Array.from(map.values());

    // Filter by keyword
    if (filterKeyword.trim()) {
      const q = filterKeyword.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.route.toLowerCase().includes(q) ||
          g.dest_tc.toLowerCase().includes(q) ||
          g.dest_en.toLowerCase().includes(q)
      );
    }

    // Filter by time
    if (timeFilter === 'SOON') {
      list = list.filter(
        (g) => g.earliestMinutes !== null && g.earliestMinutes >= 0 && g.earliestMinutes <= 5
      );
    } else if (timeFilter === 'TEN') {
      list = list.filter(
        (g) => g.earliestMinutes !== null && g.earliestMinutes >= 0 && g.earliestMinutes <= 10
      );
    }

    // Sort by earliest departure, then route number
    list.sort((a, b) => {
      if (a.earliestMinutes !== null && b.earliestMinutes !== null) {
        return a.earliestMinutes - b.earliestMinutes;
      }
      if (a.earliestMinutes !== null) return -1;
      if (b.earliestMinutes !== null) return 1;
      return a.route.localeCompare(b.route, undefined, { numeric: true });
    });

    return list;
  }, [result, filterKeyword, timeFilter]);

  // Chronological timeline view
  const chronologicalList = useMemo(() => {
    if (!result || !result.etas) return [];

    let list = result.etas.map((item) => ({
      ...item,
      diffMinutes: getEtaMinutes(item.eta),
    }));

    // Filter by keyword
    if (filterKeyword.trim()) {
      const q = filterKeyword.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.route.toLowerCase().includes(q) ||
          item.dest_tc.toLowerCase().includes(q) ||
          item.dest_en.toLowerCase().includes(q)
      );
    }

    // Filter by time
    if (timeFilter === 'SOON') {
      list = list.filter(
        (item) => item.diffMinutes !== null && item.diffMinutes >= 0 && item.diffMinutes <= 5
      );
    } else if (timeFilter === 'TEN') {
      list = list.filter(
        (item) => item.diffMinutes !== null && item.diffMinutes >= 0 && item.diffMinutes <= 10
      );
    }

    // Sort by arrival time
    list.sort((a, b) => {
      if (!a.eta && !b.eta) return 0;
      if (!a.eta) return 1;
      if (!b.eta) return -1;
      return new Date(a.eta).getTime() - new Date(b.eta).getTime();
    });

    return list;
  }, [result, filterKeyword, timeFilter]);

  const isSaved = result ? savedStops.some((s) => s.stopId === result.stop.stop) : false;

  const handleCopyJson = () => {
    if (!result?.rawJson) return;
    navigator.clipboard.writeText(JSON.stringify(result.rawJson, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search & Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
                <Wifi className="w-3 h-3 text-red-600" />
                政府開放數據即時連線 (DATA.GOV.HK)
              </span>
              <span className="text-xs text-slate-400">即時抵站 ETA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              輸入 STOP ID 查詢途經路線實時到站時間
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              輸入香港巴士站編號（STOP ID），系統自動向特區政府及巴士公司 API 查詢，即時顯示該站<strong>所有停靠路線</strong>、預計抵達倒數分鐘及衛星定位實時狀態。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[11px] text-slate-500 font-medium">營運公司：</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              {(
                [
                  { id: 'AUTO', label: '自動辨識' },
                  { id: 'KMB', label: '九巴/龍運' },
                  { id: 'CTB', label: '城巴' },
                  { id: 'NLB', label: '嶼巴' },
                ] as const
              ).map((co) => (
                <button
                  key={co.id}
                  onClick={() => {
                    setCompanyPref(co.id);
                    if (stopInput.trim()) executeQuery(stopInput.trim(), co.id);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    companyPref === co.id
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {co.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeQuery(stopInput);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold">
              #
            </div>
            <input
              id="input-stop-id"
              type="text"
              value={stopInput}
              onChange={(e) => setStopInput(e.target.value.trim())}
              placeholder="輸入巴士站 STOP ID (如 A3ADFCDF8487ADB9 或 001032)..."
              className="w-full pl-9 pr-24 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-medium"
            />
            {stopInput && (
              <button
                type="button"
                onClick={() => setStopInput('')}
                className="absolute inset-y-0 right-2 px-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                清除
              </button>
            )}
          </div>

          <button
            id="btn-search-stop-eta"
            type="submit"
            disabled={isLoading || !stopInput}
            className="px-7 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>查詢政府 API 中...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>查詢實時到站時間</span>
              </>
            )}
          </button>
        </form>

        {/* Fast Sample Chips */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>熱門巴士站範例（點擊即查）：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FEATURED_STOPS.map((s) => {
              const isSelected = stopInput === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStopInput(s.id);
                    setCompanyPref(s.company);
                    executeQuery(s.id, s.company);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-50 border-red-300 text-red-800 font-bold shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      s.company === 'KMB'
                        ? 'bg-red-100 text-red-800'
                        : s.company === 'CTB'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {s.company}
                  </span>
                  <span>{s.label}</span>
                  <span className="font-mono text-slate-400 text-[11px]">({s.id.slice(0, 8)})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">{errorMsg}</div>
            <div className="text-xs text-amber-700">
              提示：九巴 STOP ID 為 16 位十六進制字串（如 <code>A3ADFCDF8487ADB9</code>）；城巴 STOP ID 為 6 位數字（如 <code>001032</code>）；嶼巴為數字。
            </div>
          </div>
        </div>
      )}

      {/* Loaded Stop Header & Controls */}
      {result && (
        <div className="space-y-4">
          {/* Main Stop Overview Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    result.stop.company === 'KMB'
                      ? 'bg-red-600 text-white'
                      : result.stop.company === 'CTB'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-sky-500 text-white'
                  }`}
                >
                  {result.stop.company === 'KMB'
                    ? '九巴 / 龍運 (KMB)'
                    : result.stop.company === 'CTB'
                    ? '城巴 (Citybus)'
                    : '新大嶼山巴士 (NLB)'}
                </span>

                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已成功從政府 API 載入
                </span>

                <span className="text-xs text-slate-400 font-mono">
                  響應延遲: {result.latencyMs}ms
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {result.stop.name_tc}
              </h3>
              {result.stop.name_en && (
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                  {result.stop.name_en}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* STOP ID Badge */}
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono">
                <span className="text-[10px] uppercase text-slate-400 font-sans font-bold">
                  STOP ID:
                </span>
                <span className="text-sm font-bold text-emerald-400 select-all">
                  {result.stop.stop}
                </span>
              </div>

              <CopyButton text={result.stop.stop} label="複製 ID" title="複製此 STOP ID" />

              <button
                onClick={() =>
                  onToggleSave(
                    result.stop.stop,
                    result.stop.name_tc,
                    result.stop.name_en,
                    result.stop.company
                  )
                }
                className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  isSaved
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                    : 'bg-slate-800 text-slate-200 hover:text-white border-slate-700'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? '已收藏' : '收藏此站'}</span>
              </button>

              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  showMap
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-slate-800 text-slate-200 hover:text-white border-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{showMap ? '隱藏地圖' : '查看地圖'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Map */}
          {showMap && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600" />
                  巴士站地理坐標: {result.stop.lat}, {result.stop.long}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${result.stop.lat},${result.stop.long}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-red-600 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <span>在 Google 地圖開啟</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <StopMap
                lat={result.stop.lat}
                long={result.stop.long}
                stopName={result.stop.name_tc}
                stopId={result.stop.stop}
                className="h-64 w-full rounded-xl"
              />
            </div>
          )}

          {/* Control Bar: Route Filter, View Switcher & Live Refresh */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter by keyword */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="快速篩選路線或目的地 (如 1A, 山頂)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Time filter pills */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  onClick={() => setTimeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all ${
                    timeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  全部班次
                </button>
                <button
                  onClick={() => setTimeFilter('SOON')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all ${
                    timeFilter === 'SOON'
                      ? 'bg-white text-rose-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  即將抵達 (≤5分)
                </button>
                <button
                  onClick={() => setTimeFilter('TEN')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all ${
                    timeFilter === 'TEN'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10分鐘內
                </button>
              </div>
            </div>

            {/* Right: View Mode & Auto-refresh */}
            <div className="flex items-center gap-3 self-end md:self-auto text-xs">
              {/* View Switcher */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                <button
                  onClick={() => setViewMode('ROUTE')}
                  title="按路線分組查看"
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer flex items-center gap-1 ${
                    viewMode === 'ROUTE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>按路線</span>
                </button>
                <button
                  onClick={() => setViewMode('TIMELINE')}
                  title="發車總時間表"
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer flex items-center gap-1 ${
                    viewMode === 'TIMELINE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>時間序看板</span>
                </button>
              </div>

              {/* Auto Refresh & Manual Refresh */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-2 py-1 rounded border cursor-pointer font-medium flex items-center gap-1 ${
                    autoRefresh
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                  title={autoRefresh ? '點擊暫停自動更新' : '點擊啟用 30 秒自動更新'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{autoRefresh ? `${countdown}s` : '自動更新關閉'}</span>
                </button>

                <button
                  onClick={() => executeQuery(result.stop.stop, companyPref)}
                  disabled={isLoading}
                  className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="立即更新實時抵站時間"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {result.etas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">此巴士站暫無即時抵站資料</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                政府 API 未傳回此站的實時班次資料，可能是目前該站未在營運時段內，或該站點僅於特定時段服務。
              </p>
            </div>
          ) : viewMode === 'ROUTE' ? (
            /* VIEW MODE: Grouped by Route */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  共找到 <strong>{groupedRoutes.length}</strong> 條途經路線（
                  {result.etas.length} 個班次）
                </span>
                {lastUpdated && (
                  <span className="font-mono">
                    資料更新時間: {lastUpdated.toLocaleTimeString('zh-HK')}
                  </span>
                )}
              </div>

              {groupedRoutes.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                  沒有符合篩選條件「{filterKeyword}」的路線。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {groupedRoutes.map((group) => {
                    const sortedDepartures = [...group.departures].sort((a, b) => {
                      if (!a.eta) return 1;
                      if (!b.eta) return -1;
                      return new Date(a.eta).getTime() - new Date(b.eta).getTime();
                    });

                    const firstEta = sortedDepartures[0];
                    const firstMinutes = firstEta ? getEtaMinutes(firstEta.eta) : null;

                    return (
                      <div
                        key={`${group.route}-${group.dir}-${group.dest_tc}`}
                        className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                      >
                        {/* Route Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-11 rounded-lg bg-slate-900 text-white font-mono font-black text-lg flex items-center justify-center tracking-tight shadow-2xs">
                              {group.route}
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 font-medium">
                                往{' '}
                                <strong className="text-slate-900 font-bold text-base">
                                  {group.dest_tc || group.dest_en}
                                </strong>
                              </div>
                              {group.dest_en && group.dest_en !== group.dest_tc && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {group.dest_en}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Company Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              group.co === 'KMB'
                                ? 'bg-red-100 text-red-800'
                                : group.co === 'CTB'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {group.co}
                          </span>
                        </div>

                        {/* Departures Row */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {sortedDepartures.slice(0, 3).map((dep, idx) => {
                            const minutes = getEtaMinutes(dep.eta);
                            const etaDate = dep.eta ? new Date(dep.eta) : null;
                            const isFirst = idx === 0;

                            const isGps = dep.rmk_tc?.includes('原定')
                              ? false
                              : dep.rmk_tc?.includes('預定')
                              ? false
                              : dep.noGPS === 1
                              ? false
                              : true;

                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                                  isFirst ? 'bg-slate-50/80 font-medium' : 'text-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                                    {idx + 1}
                                  </span>

                                  <div>
                                    <span className="font-mono font-semibold text-slate-800">
                                      {etaDate
                                        ? etaDate.toLocaleTimeString('zh-HK', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : '未有班次'}
                                    </span>

                                    {dep.rmk_tc ? (
                                      <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                                        {dep.rmk_tc}
                                      </span>
                                    ) : isGps ? (
                                      <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
                                        GPS 實時
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="text-right">
                                  {minutes !== null && minutes >= 0 ? (
                                    minutes === 0 ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[11px] animate-pulse">
                                        即將抵達
                                      </span>
                                    ) : minutes <= 5 ? (
                                      <span className="font-black text-rose-600 text-sm">
                                        {minutes}{' '}
                                        <span className="text-xs font-normal text-slate-500">
                                          分鐘
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="font-bold text-slate-800 text-sm">
                                        {minutes}{' '}
                                        <span className="text-xs font-normal text-slate-500">
                                          分鐘
                                        </span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 text-xs">未有預計</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VIEW MODE: Chronological Timeline Board */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  實時發車總時間表 (按抵達先後排序)
                </span>
                <span className="text-slate-400 font-mono">
                  共 {chronologicalList.length} 班次
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {chronologicalList.map((dep, idx) => {
                  const etaDate = dep.eta ? new Date(dep.eta) : null;
                  const minutes = dep.diffMinutes;
                  const isSoon = minutes !== null && minutes <= 3 && minutes >= 0;

                  return (
                    <div
                      key={idx}
                      className={`p-3 sm:px-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                        isSoon ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {dep.route}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            往 {dep.dest_tc || dep.dest_en}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-600">{dep.co}</span>
                            {dep.rmk_tc && (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                {dep.rmk_tc}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">
                          {minutes !== null && minutes >= 0 ? (
                            minutes === 0 ? (
                              <span className="text-rose-600 font-black animate-pulse">
                                即將抵達
                              </span>
                            ) : (
                              <>
                                <span className={minutes <= 5 ? 'text-rose-600' : 'text-slate-900'}>
                                  {minutes}
                                </span>{' '}
                                <span className="text-xs font-normal text-slate-500">分鐘</span>
                              </>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">暫無預計</span>
                          )}
                        </div>
                        {etaDate && (
                          <div className="text-[10px] font-mono text-slate-400">
                            預計{' '}
                            {etaDate.toLocaleTimeString('zh-HK', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Government Open Data API Inspector */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  政府開放數據 API 請求詳情 (DATA.GOV.HK)
                </h4>
              </div>

              <button
                onClick={() => setShowApiInspector(!showApiInspector)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>{showApiInspector ? '收起 API 詳情' : '檢視原始 API 資料'}</span>
                {showApiInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* API Endpoint Line */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">
                  GET
                </span>
                <span className="text-slate-300 truncate select-all">{result.apiUrl}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CopyButton text={result.apiUrl} label="複製 API 網址" />
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedJson ? '已複製 JSON' : '複製 JSON 回應'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible raw JSON */}
            {showApiInspector && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Provider: {result.provider}</span>
                  <span>Generated: {result.generatedTime || 'N/A'}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-80 overflow-y-auto font-mono text-[11px] text-emerald-300 select-all">
                  <pre>{JSON.stringify(result.rawJson, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
