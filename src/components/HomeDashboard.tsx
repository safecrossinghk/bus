import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Bus,
  RefreshCw,
  Settings,
  AlertCircle,
  Wifi,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Compass,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { UserTrackedConfig, EtaItem, UnifiedStopEtaResult } from '../types';
import { fetchStopAllRoutesEta } from '../services/busApi';
import { CopyButton } from './CopyButton';

interface HomeDashboardProps {
  config: UserTrackedConfig | null;
  onGoToSettings: () => void;
  onApplyPreset: (config: UserTrackedConfig) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  config,
  onGoToSettings,
  onApplyPreset,
}) => {
  const [etaResult, setEtaResult] = useState<UnifiedStopEtaResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // Filter keyword
  const [keyword, setKeyword] = useState('');

  // Fetch ETAs for the configured stop
  const loadEtas = async (isManual = false) => {
    if (!config?.stopId) return;

    if (isManual) setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetchStopAllRoutesEta(config.stopId, config.company);
      setEtaResult(res);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch (err: any) {
      console.error('Failed to load ETA for dashboard:', err);
      setErrorMsg(
        err.message || '無法取得實時到站時間，請檢查網路連線或稍後重試。'
      );
    } finally {
      if (isManual) setIsLoading(false);
    }
  };

  // On mount or config change
  useEffect(() => {
    if (config?.stopId) {
      loadEtas(true);
    }
  }, [config?.stopId, config?.company]);

  // Auto-refresh countdown loop
  useEffect(() => {
    if (!autoRefresh || !config?.stopId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadEtas(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, config?.stopId, config?.company]);

  // Calculate minutes from now
  const getEtaMinutes = (etaString: string | null) => {
    if (!etaString) return null;
    const etaTime = new Date(etaString);
    const now = new Date();
    const diffMs = etaTime.getTime() - now.getTime();
    return Math.round(diffMs / 60000);
  };

  // Filter & match selected routes only!
  const matchedRoutes = useMemo(() => {
    if (!config || !etaResult) return [];

    const selectedKeysSet = new Set(config.selectedRouteKeys || []);
    const selectedRoutesSet = new Set(config.selectedRoutes || []);

    // Group ETA items by route+destination
    const map = new Map<
      string,
      {
        key: string;
        route: string;
        dest_tc: string;
        dest_en: string;
        co: string;
        departures: EtaItem[];
        earliestMinutes: number | null;
      }
    >();

    etaResult.etas.forEach((item) => {
      const routeKey = `${item.route}||${item.dest_tc || item.dest_en}`;
      const isSelected =
        selectedKeysSet.has(routeKey) || selectedRoutesSet.has(item.route);

      if (!isSelected) return;

      const minutes = getEtaMinutes(item.eta);

      if (!map.has(routeKey)) {
        map.set(routeKey, {
          key: routeKey,
          route: item.route,
          dest_tc: item.dest_tc || item.dest_en,
          dest_en: item.dest_en || item.dest_tc,
          co: item.co,
          departures: [item],
          earliestMinutes: minutes,
        });
      } else {
        const group = map.get(routeKey)!;
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

    // Sort departures within each route
    list.forEach((group) => {
      group.departures.sort((a, b) => {
        if (!a.eta && !b.eta) return 0;
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      });
    });

    // Filter by search keyword
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.route.toLowerCase().includes(q) ||
          g.dest_tc.toLowerCase().includes(q) ||
          g.dest_en.toLowerCase().includes(q)
      );
    }

    // Sort by earliest departure
    list.sort((a, b) => {
      if (a.earliestMinutes !== null && b.earliestMinutes !== null) {
        return a.earliestMinutes - b.earliestMinutes;
      }
      if (a.earliestMinutes !== null) return -1;
      if (b.earliestMinutes !== null) return 1;
      return a.route.localeCompare(b.route, undefined, { numeric: true });
    });

    return list;
  }, [config, etaResult, keyword]);

  // If no config set yet
  if (!config || !config.stopId) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto ring-8 ring-red-50/50">
            <Bus className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              尚未設定想追蹤的巴士路線
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              請先前往<strong>設定頁面</strong>填上你的巴士站 STOP ID，並勾選你想要的巴士路線。儲存後，主頁面便會自動顯示你選擇的路線及<strong>接下來 3 班車的實時到站時間</strong>。
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onGoToSettings}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-base font-bold transition-all cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              <span>前往設定頁面選擇路線</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick preset demos */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>或者一鍵載入熱門範例：</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() =>
                  onApplyPreset({
                    stopId: 'A3ADFCDF8487ADB9',
                    stopName_tc: '尖沙咀碼頭總站',
                    stopName_en: 'Star Ferry Pier',
                    company: 'KMB',
                    selectedRoutes: ['1', '1A', '2', '6'],
                    selectedRouteKeys: ['1||竹園邨', '1A||中秀茂坪', '2||蘇屋', '6||荔枝角'],
                    lastConfiguredAt: Date.now(),
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                  九巴
                </span>
                <span>尖沙咀碼頭 (1, 1A, 2, 6)</span>
              </button>

              <button
                onClick={() =>
                  onApplyPreset({
                    stopId: '001032',
                    stopName_tc: '中環 (交易廣場)',
                    stopName_en: 'Central (Exchange Square)',
                    company: 'CTB',
                    selectedRoutes: ['12', '15', '70'],
                    selectedRouteKeys: [
                      '12||Robinson Road',
                      '15||The Peak',
                      '70||Wah Kwai Estate',
                    ],
                    lastConfiguredAt: Date.now(),
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                  城巴
                </span>
                <span>中環交易廣場 (12, 15往山頂, 70)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Configured Stop Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                config.company === 'KMB'
                  ? 'bg-red-600 text-white'
                  : config.company === 'CTB'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-sky-500 text-white'
              }`}
            >
              {config.company === 'KMB'
                ? '九巴 / 龍運'
                : config.company === 'CTB'
                ? '城巴'
                : '嶼巴'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Wifi className="w-3 h-3 text-emerald-400" />
              政府開放數據已連線
            </span>

            <span className="text-xs text-slate-400 font-mono">
              STOP ID:{' '}
              <strong className="text-emerald-400 font-bold select-all">
                {config.stopId}
              </strong>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {config.stopName_tc}
          </h2>
          {config.stopName_en && (
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              {config.stopName_en}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>
              已設定追蹤 <strong>{config.selectedRouteKeys?.length || config.selectedRoutes.length}</strong>{' '}
              條巴士路線
            </span>
          </div>
        </div>

        {/* Actions on Stop */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CopyButton text={config.stopId} label="複製 STOP ID" />

          <button
            onClick={onGoToSettings}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>更改路線設定</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Auto-refresh, Last update, Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="快速搜尋已選路線 (如 1A)..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
            />
          </div>

          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              清除
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs self-end sm:self-auto">
          {lastUpdated && (
            <span className="text-slate-400 font-mono hidden md:inline">
              最後更新: {lastUpdated.toLocaleTimeString('zh-HK')}
            </span>
          )}

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg border cursor-pointer font-medium flex items-center gap-1.5 transition-all ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
            title={autoRefresh ? '點擊暫停 30 秒自動更新' : '點擊啟用 30 秒自動更新'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{autoRefresh ? `${countdown} 秒後更新` : '自動更新已暫停'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => loadEtas(true)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="立即更新實時抵站時間"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Core Display: Selected Bus Routes with Next 3 Upcoming Buses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-red-600" />
            <span>我選擇的巴士路線實時到站看板（接下來 3 班車預計抵站時間）：</span>
          </div>
          <span className="font-mono">
            顯示 {matchedRoutes.length} 條路線
          </span>
        </div>

        {matchedRoutes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">
              {keyword ? '沒有符合搜尋關鍵字的路線' : '目前所選路線暫無即時到站資料'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              可能目前該路線未在服務時段內，或你可以前往設定頁面選擇其他停靠路線。
            </p>
            <button
              onClick={onGoToSettings}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold cursor-pointer hover:bg-red-100"
            >
              前往設定頁面
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedRoutes.map((routeGroup) => {
              const nextThree = routeGroup.departures.slice(0, 3);

              return (
                <div
                  key={routeGroup.key}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs p-5 space-y-4 transition-all"
                >
                  {/* Route Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-xl bg-slate-950 text-white font-mono font-black text-xl flex items-center justify-center tracking-tight shadow-2xs">
                        {routeGroup.route}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">
                          往{' '}
                          <strong className="text-slate-900 font-bold text-base sm:text-lg">
                            {routeGroup.dest_tc}
                          </strong>
                        </div>
                        {routeGroup.dest_en && routeGroup.dest_en !== routeGroup.dest_tc && (
                          <div className="text-[11px] text-slate-400 font-medium truncate max-w-xs">
                            {routeGroup.dest_en}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        routeGroup.co === 'KMB'
                          ? 'bg-red-100 text-red-800'
                          : routeGroup.co === 'CTB'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {routeGroup.co}
                    </span>
                  </div>

                  {/* NEXT 3 ARRIVING BUSES (接下來 3 班車) */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>接下來 3 班車預計抵達</span>
                      <span>倒數分鐘</span>
                    </div>

                    {nextThree.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        今日班次已完結或暫無實時預計資料
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[0, 1, 2].map((index) => {
                          const dep = nextThree[index];

                          if (!dep) {
                            return (
                              <div
                                key={index}
                                className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-400 text-[10px] font-mono flex items-center justify-center font-bold">
                                    {index + 1}
                                  </span>
                                  <span>第 {index + 1} 班車：暫未有班次</span>
                                </div>
                                <span className="text-[11px] text-slate-400">--</span>
                              </div>
                            );
                          }

                          const minutes = getEtaMinutes(dep.eta);
                          const etaDate = dep.eta ? new Date(dep.eta) : null;
                          const isFirst = index === 0;

                          const isGps =
                            !dep.rmk_tc?.includes('原定') &&
                            !dep.rmk_tc?.includes('預定') &&
                            dep.noGPS !== 1;

                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                isFirst
                                  ? 'bg-slate-50/90 border-slate-300 shadow-2xs'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center font-black ${
                                    isFirst
                                      ? 'bg-slate-900 text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {index + 1}
                                </span>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {isFirst ? '下班車' : `第 ${index + 1} 班`}
                                    </span>
                                    {etaDate && (
                                      <span className="text-xs text-slate-500 font-mono">
                                        (
                                        {etaDate.toLocaleTimeString('zh-HK', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                        )
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {dep.rmk_tc ? (
                                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                                        {dep.rmk_tc}
                                      </span>
                                    ) : isGps ? (
                                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                                        <Wifi className="w-2.5 h-2.5 text-emerald-600" />
                                        GPS 實時
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                        原定班次
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Minutes countdown pill */}
                              <div className="text-right">
                                {minutes !== null && minutes >= 0 ? (
                                  minutes === 0 ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs animate-pulse shadow-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                      即將抵達
                                    </span>
                                  ) : minutes <= 5 ? (
                                    <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                                      <span className="text-lg font-black">{minutes}</span>
                                      <span className="text-xs font-sans font-bold">分鐘</span>
                                    </div>
                                  ) : minutes <= 10 ? (
                                    <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                                      <span className="text-base font-black">{minutes}</span>
                                      <span className="text-xs font-sans font-medium">分鐘</span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-baseline gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono">
                                      <span className="text-sm font-bold">{minutes}</span>
                                      <span className="text-xs font-sans font-medium">分鐘</span>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400">未有預計</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            數據來源：香港特區政府<strong>「資料一線通」(DATA.GOV.HK)</strong> 及香港專營巴士開放數據平台。
          </span>
        </div>
        <button
          onClick={onGoToSettings}
          className="text-red-600 hover:text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <span>調整追蹤路線</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
