import React, { useState, useEffect } from 'react';
import { Search, ArrowRightLeft, Bus, Clock, MapPin, Code2, Bookmark, Check, ChevronDown, ChevronUp, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { RouteInfo, RouteStopItem, EtaItem, SavedStop } from '../types';
import { getKmbRoutes, getKmbRouteStops, getKmbStopEta, getCtbRouteStops, getCtbEta, POPULAR_ROUTES } from '../services/busApi';
import { CopyButton } from './CopyButton';

interface RouteSearchProps {
  onSelectStop: (stopId: string, stopName: string, company: 'KMB' | 'CTB', lat?: number, long?: number) => void;
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB') => void;
}

export const RouteSearch: React.FC<RouteSearchProps> = ({
  onSelectStop,
  savedStops,
  onToggleSave,
}) => {
  const [company, setCompany] = useState<'KMB' | 'CTB'>('KMB');
  const [routeInput, setRouteInput] = useState('1A');
  const [activeRoute, setActiveRoute] = useState('1A');
  const [bound, setBound] = useState<'O' | 'I'>('O'); // O: Outbound, I: Inbound
  const [allKmbRoutes, setAllKmbRoutes] = useState<RouteInfo[]>([]);
  const [currentRouteInfo, setCurrentRouteInfo] = useState<RouteInfo | null>(null);

  const [stops, setStops] = useState<RouteStopItem[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stop filter inside current route
  const [filterQuery, setFilterQuery] = useState('');

  // Real-time ETA states keyed by stop ID
  const [expandedEtaStop, setExpandedEtaStop] = useState<string | null>(null);
  const [etaList, setEtaList] = useState<EtaItem[]>([]);
  const [isLoadingEta, setIsLoadingEta] = useState(false);

  // Load KMB routes for autocomplete
  useEffect(() => {
    getKmbRoutes()
      .then(routes => setAllKmbRoutes(routes))
      .catch(() => {});
  }, []);

  // Update current route info and load stops whenever activeRoute, bound, or company changes
  useEffect(() => {
    loadRouteStops(activeRoute, bound, company);
  }, [activeRoute, bound, company]);

  const loadRouteStops = async (routeToLoad: string, currentBound: 'O' | 'I', currentCompany: 'KMB' | 'CTB') => {
    if (!routeToLoad.trim()) return;
    setIsLoadingStops(true);
    setErrorMessage(null);
    setStops([]);
    setExpandedEtaStop(null);
    setEtaList([]);

    const cleanRoute = routeToLoad.trim().toUpperCase();

    try {
      if (currentCompany === 'KMB') {
        // Find matching route info
        const matched = allKmbRoutes.find(r => r.route === cleanRoute && r.bound === currentBound);
        if (matched) {
          setCurrentRouteInfo(matched);
        } else {
          // If not in cache yet, try finding any bound
          const anyBound = allKmbRoutes.find(r => r.route === cleanRoute);
          if (anyBound) {
            setCurrentRouteInfo({
              ...anyBound,
              bound: currentBound,
              orig_tc: currentBound === 'O' ? anyBound.orig_tc : anyBound.dest_tc,
              dest_tc: currentBound === 'O' ? anyBound.dest_tc : anyBound.orig_tc,
            });
          } else {
            setCurrentRouteInfo(null);
          }
        }

        const data = await getKmbRouteStops(cleanRoute, currentBound, '1');
        if (data.length === 0) {
          setErrorMessage(`找不到九巴路線 ${cleanRoute} 的停站資料。請確認路線編號是否正確或嘗試切換方向。`);
        } else {
          setStops(data);
        }
      } else {
        // Citybus
        setCurrentRouteInfo({
          route: cleanRoute,
          bound: currentBound,
          service_type: '1',
          orig_tc: currentBound === 'O' ? '起點站' : '終點站',
          orig_en: 'Origin',
          dest_tc: currentBound === 'O' ? '終點站' : '起點站',
          dest_en: 'Destination',
          company: 'CTB',
        });
        const data = await getCtbRouteStops(cleanRoute, currentBound);
        if (data.length === 0) {
          setErrorMessage(`找不到城巴路線 ${cleanRoute} 的停站資料。請確認路線編號是否正確（例如 1, A21, E21, 102）。`);
        } else {
          setStops(data);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || '載入路線停站資料時發生錯誤');
    } finally {
      setIsLoadingStops(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeInput.trim()) {
      setActiveRoute(routeInput.trim().toUpperCase());
    }
  };

  const handleQuickRoute = (r: string, comp: 'KMB' | 'CTB') => {
    setCompany(comp);
    setRouteInput(r);
    setActiveRoute(r);
  };

  const handleToggleBound = () => {
    setBound(prev => (prev === 'O' ? 'I' : 'O'));
  };

  const handleToggleEta = async (stopId: string) => {
    if (expandedEtaStop === stopId) {
      setExpandedEtaStop(null);
      setEtaList([]);
      return;
    }

    setExpandedEtaStop(stopId);
    setIsLoadingEta(true);
    setEtaList([]);

    try {
      if (company === 'KMB') {
        const data = await getKmbStopEta(stopId);
        // Filter ETAs for current route if possible
        const routeSpecific = data.filter(item => item.route.toUpperCase() === activeRoute.toUpperCase());
        setEtaList(routeSpecific.length > 0 ? routeSpecific : data);
      } else {
        const data = await getCtbEta(stopId, activeRoute);
        setEtaList(data);
      }
    } catch (err) {
      console.error('Failed to load ETA:', err);
    } finally {
      setIsLoadingEta(false);
    }
  };

  const isStopSaved = (stopId: string) => savedStops.some(s => s.stopId === stopId);

  // Filter stops in list
  const filteredStops = stops.filter(s => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.stop.toLowerCase().includes(q) ||
      (s.name_tc && s.name_tc.toLowerCase().includes(q)) ||
      (s.name_en && s.name_en.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Search Controls Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bus className="w-5 h-5 text-red-600" />
            按路線查詢停站與 STOP ID
          </h2>

          {/* Company Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              id="btn-select-kmb"
              onClick={() => {
                setCompany('KMB');
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                company === 'KMB' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              九巴 / 龍運 (KMB)
            </button>
            <button
              id="btn-select-ctb"
              onClick={() => {
                setCompany('CTB');
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                company === 'CTB' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              城巴 (Citybus)
            </button>
          </div>
        </div>

        {/* Route Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-route-search"
              type="text"
              value={routeInput}
              onChange={(e) => setRouteInput(e.target.value)}
              placeholder="輸入路線編號 (例如: 1A, 960, 102, B1, A21...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-medium"
            />
          </div>

          <button
            id="btn-submit-route"
            type="submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>查詢路線</span>
          </button>

          <button
            id="btn-toggle-bound"
            type="button"
            onClick={handleToggleBound}
            title="切換行車方向"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="hidden sm:inline">切換方向</span>
          </button>
        </form>

        {/* Quick Route Suggestions */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1">常用路線範例:</span>
          {POPULAR_ROUTES.map((p) => (
            <button
              key={`${p.company}-${p.route}`}
              onClick={() => handleQuickRoute(p.route, p.company)}
              className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                activeRoute === p.route && company === p.company
                  ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={p.company === 'KMB' ? 'text-red-600' : 'text-amber-600'}>
                [{p.company}]
              </span>{' '}
              {p.route}
            </button>
          ))}
        </div>
      </div>

      {/* Route Direction & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
              {company}
            </span>
            <h3 className="text-2xl font-black tracking-tight">{activeRoute} 號線</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
              方向: {bound === 'O' ? '去程 (Outbound)' : '回程 (Inbound)'}
            </span>
          </div>

          {currentRouteInfo && (
            <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <span className="text-white font-bold">{currentRouteInfo.orig_tc}</span>
              <span className="text-slate-400">➔</span>
              <span className="text-white font-bold">{currentRouteInfo.dest_tc}</span>
              {currentRouteInfo.orig_en && (
                <span className="text-xs text-slate-400 hidden lg:inline">
                  ({currentRouteInfo.orig_en} → {currentRouteInfo.dest_en})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">總停站數目</div>
            <div className="text-xl font-bold text-emerald-400">
              {isLoadingStops ? '載入中...' : `${stops.length} 個站點`}
            </div>
          </div>
          <button
            id="btn-refresh-route"
            onClick={() => loadRouteStops(activeRoute, bound, company)}
            disabled={isLoadingStops}
            className="p-2.5 bg-slate-700/80 hover:bg-slate-700 active:bg-slate-600 text-white rounded-lg transition-all cursor-pointer"
            title="重新載入停站"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStops ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-xs text-amber-700 mt-1">
              小提示：九巴路線方向為「去程 / 回程」，部分特快線（如 X 線）或循環線可能僅單向營運，請嘗試點擊「切換方向」或查看城巴標籤。
            </p>
          </div>
        </div>
      )}

      {/* Filter within stops */}
      {stops.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <input
              id="input-filter-route-stops"
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="在此路線中篩選站名或 STOP ID..."
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500">
            顯示 {filteredStops.length} / {stops.length} 個站點
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingStops && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {/* Stop Ladder List */}
      {!isLoadingStops && filteredStops.length > 0 && (
        <div className="space-y-3 relative">
          {/* Vertical route line guide */}
          <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-slate-200 -z-0 hidden sm:block" />

          {filteredStops.map((stopItem, index) => {
            const isSaved = isStopSaved(stopItem.stop);
            const isEtaOpen = expandedEtaStop === stopItem.stop;

            return (
              <div
                key={`${stopItem.stop}-${stopItem.seq}`}
                id={`route-stop-card-${stopItem.stop}`}
                className={`relative z-10 bg-white border rounded-xl transition-all duration-200 hover:shadow-md ${
                  isEtaOpen ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Sequence & Stop Name */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Seq Badge */}
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-4 ring-white">
                      {stopItem.seq}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 hover:text-red-600 transition-colors">
                          {stopItem.name_tc || `巴士站 ${stopItem.stop}`}
                        </h4>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            起點站
                          </span>
                        )}
                        {index === filteredStops.length - 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            終點站
                          </span>
                        )}
                      </div>
                      {stopItem.name_en && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {stopItem.name_en}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: The STOP ID Spotlight & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pl-11 sm:pl-0">
                    {/* STOP ID High-contrast code badge */}
                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-2xs font-mono">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                        STOP ID:
                      </span>
                      <span className="font-bold text-sm tracking-wide text-emerald-400 select-all">
                        {stopItem.stop}
                      </span>
                    </div>

                    {/* Copy Button */}
                    <CopyButton
                      text={stopItem.stop}
                      label="複製 ID"
                      title={`複製 STOP ID: ${stopItem.stop}`}
                    />

                    {/* Check ETA button */}
                    <button
                      id={`btn-eta-${stopItem.stop}`}
                      onClick={() => handleToggleEta(stopItem.stop)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                        isEtaOpen
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                      title="查閱即時到站班次"
                    >
                      <Clock className="w-3.5 h-3.5 text-red-600" />
                      <span>{isEtaOpen ? '收起班次' : '實時抵站'}</span>
                      {isEtaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Map / Details Modal trigger */}
                    <button
                      onClick={() => onSelectStop(stopItem.stop, stopItem.name_tc || '', company, stopItem.lat, stopItem.long)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all cursor-pointer"
                      title="查看地圖位置與 API 詳細資料"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>站點詳情</span>
                    </button>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => onToggleSave(stopItem.stop, stopItem.name_tc || '', stopItem.name_en || '', company)}
                      className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-amber-50 text-amber-600 border-amber-300'
                          : 'bg-white text-slate-400 hover:text-slate-600 border-slate-300'
                      }`}
                      title={isSaved ? '已收藏' : '加入收藏'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Real-time ETA Drawer */}
                {isEtaOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/80 p-4 rounded-b-xl">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-red-600" />
                        <span>即時到站班次 (ETA) - 路線 {activeRoute}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        數據源: {company === 'KMB' ? '九巴開放數據 (data.etabus.gov.hk)' : '城巴開放數據 (data.gov.hk)'}
                      </span>
                    </div>

                    {isLoadingEta ? (
                      <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                        <span>正在載入實時抵站時間...</span>
                      </div>
                    ) : etaList.length === 0 ? (
                      <div className="py-3 text-xs text-slate-500 bg-white rounded-lg p-3 border border-slate-200 text-center">
                        暫無即時到站資料或此時段非服務時間。
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {etaList.slice(0, 3).map((eta, idx) => {
                          const etaTime = eta.eta ? new Date(eta.eta) : null;
                          const now = new Date();
                          const diffMinutes = etaTime ? Math.round((etaTime.getTime() - now.getTime()) / 60000) : null;

                          return (
                            <div
                              key={idx}
                              className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                <span className="font-semibold text-slate-700">班次 #{idx + 1}</span>
                                <span className="text-[10px] text-slate-400">往: {eta.dest_tc}</span>
                              </div>

                              <div className="flex items-baseline justify-between mt-1">
                                <span className="text-xl font-black text-slate-900 tracking-tight">
                                  {diffMinutes !== null && diffMinutes >= 0 ? (
                                    diffMinutes === 0 ? (
                                      <span className="text-rose-600 font-bold">即將抵達</span>
                                    ) : (
                                      <>
                                        {diffMinutes} <span className="text-xs font-normal text-slate-500">分鐘</span>
                                      </>
                                    )
                                  ) : (
                                    <span className="text-xs text-slate-400">未能預計</span>
                                  )}
                                </span>
                                {etaTime && (
                                  <span className="text-xs font-mono text-slate-500">
                                    {etaTime.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>

                              {eta.rmk_tc && (
                                <div className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                  {eta.rmk_tc}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
