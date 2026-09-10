import React, { useState, useEffect } from 'react';
import {
  Settings,
  Hash,
  Search,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Bus,
  MapPin,
  AlertCircle,
  Save,
  Trash2,
  Wifi,
  ExternalLink
} from 'lucide-react';
import { BusStop, EtaItem, UserTrackedConfig } from '../types';
import { fetchStopAllRoutesEta, identifyStopIdFormat } from '../services/busApi';
import { CopyButton } from './CopyButton';

interface SettingsPageProps {
  currentConfig: UserTrackedConfig | null;
  onSaveConfig: (config: UserTrackedConfig) => void;
  onGoToHome: () => void;
}

const PRESET_STOPS = [
  { id: 'A3ADFCDF8487ADB9', label: '尖沙咀碼頭總站', company: 'KMB' as const, desc: '九巴 1, 1A, 2, 5, 6, 7 等' },
  { id: '001032', label: '中環 (交易廣場)', company: 'CTB' as const, desc: '城巴 12, 15 (往山頂), 70, 260 等' },
  { id: '37E5DC7023190C67', label: '屯門市中心總站', company: 'KMB' as const, desc: '九巴 58M, 60M, 60X, 263, 961 等' },
  { id: 'C8E7EAC13627040D', label: '沙田市中心總站', company: 'KMB' as const, desc: '九巴 48X, 49X, 81, 88K, 89 等' },
  { id: '001044', label: '上環德輔道中林士街', company: 'CTB' as const, desc: '城巴 1, 101, 111, 115 等' },
  { id: '4EB9AC6D0254CFD9', label: '美孚轉車站', company: 'KMB' as const, desc: '九巴 6, 30X, 102 等' },
  { id: '1', label: '大澳總站', company: 'NLB' as const, desc: '嶼巴 1, 11, 21 等' },
];

export interface AvailableRouteOption {
  key: string; // e.g. "1A||中秀茂坪"
  route: string;
  dest_tc: string;
  dest_en: string;
  dir?: string;
  co: string;
  count: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentConfig,
  onSaveConfig,
  onGoToHome,
}) => {
  const [stopIdInput, setStopIdInput] = useState(currentConfig?.stopId || 'A3ADFCDF8487ADB9');
  const [companyPref, setCompanyPref] = useState<'AUTO' | 'KMB' | 'CTB' | 'NLB'>(
    currentConfig?.company || 'AUTO'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loaded stop data
  const [loadedStop, setLoadedStop] = useState<BusStop | null>(
    currentConfig
      ? {
          stop: currentConfig.stopId,
          name_tc: currentConfig.stopName_tc,
          name_en: currentConfig.stopName_en || '',
          lat: 22.3193,
          long: 114.1694,
          company: currentConfig.company,
        }
      : null
  );

  const [availableRoutes, setAvailableRoutes] = useState<AvailableRouteOption[]>([]);
  const [selectedRouteKeys, setSelectedRouteKeys] = useState<Set<string>>(
    new Set(currentConfig?.selectedRouteKeys || [])
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load routes for given stop
  const handleLoadRoutes = async (idToQuery: string, compPref = companyPref) => {
    const cleanId = idToQuery.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const result = await fetchStopAllRoutesEta(cleanId, compPref);
      setLoadedStop(result.stop);

      // Extract unique route options from API response
      const routeMap = new Map<string, AvailableRouteOption>();

      result.etas.forEach((item) => {
        const routeKey = `${item.route}||${item.dest_tc || item.dest_en}`;
        if (!routeMap.has(routeKey)) {
          routeMap.set(routeKey, {
            key: routeKey,
            route: item.route,
            dest_tc: item.dest_tc || item.dest_en,
            dest_en: item.dest_en || item.dest_tc,
            dir: item.dir,
            co: item.co,
            count: 1,
          });
        } else {
          routeMap.get(routeKey)!.count += 1;
        }
      });

      const list = Array.from(routeMap.values()).sort((a, b) =>
        a.route.localeCompare(b.route, undefined, { numeric: true })
      );

      setAvailableRoutes(list);

      // If we already have selected keys for this stop, preserve them; otherwise pre-select all or first 3
      if (currentConfig && currentConfig.stopId === cleanId) {
        setSelectedRouteKeys(new Set(currentConfig.selectedRouteKeys));
      } else {
        // Default select first 3 routes if new
        const initialSelected = new Set(list.slice(0, 3).map((r) => r.key));
        setSelectedRouteKeys(initialSelected);
      }
    } catch (err: any) {
      console.error('Failed to load routes for stop:', err);
      setErrorMsg(
        err.message ||
          `無法從政府 API 載入 STOP ID「${cleanId}」的資料。請確認站點代碼或營運公司是否正確。`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initial auto-load if stopId is set
  useEffect(() => {
    if (stopIdInput) {
      handleLoadRoutes(stopIdInput, companyPref);
    }
  }, []);

  // Toggle single route selection
  const handleToggleRoute = (key: string) => {
    setSelectedRouteKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all / Deselect all
  const handleSelectAll = () => {
    const allKeys = availableRoutes.map((r) => r.key);
    setSelectedRouteKeys(new Set(allKeys));
  };

  const handleDeselectAll = () => {
    setSelectedRouteKeys(new Set());
  };

  // Save Config
  const handleSave = () => {
    if (!loadedStop) return;

    if (selectedRouteKeys.size === 0) {
      setErrorMsg('請至少選擇一條巴士路線！');
      return;
    }

    const selectedKeysArray: string[] = Array.from(selectedRouteKeys);
    // Extract unique route numbers
    const selectedRoutesArray: string[] = Array.from(
      new Set(selectedKeysArray.map((k: string) => k.split('||')[0]))
    );

    const newConfig: UserTrackedConfig = {
      stopId: loadedStop.stop,
      stopName_tc: loadedStop.name_tc,
      stopName_en: loadedStop.name_en,
      company: loadedStop.company,
      selectedRoutes: selectedRoutesArray,
      selectedRouteKeys: selectedKeysArray,
      lastConfiguredAt: Date.now(),
    };

    onSaveConfig(newConfig);
    setSavedSuccess(true);

    // After a short feedback, switch to Home
    setTimeout(() => {
      onGoToHome();
    }, 700);
  };

  const filteredRoutes = availableRoutes.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.trim().toLowerCase();
    return (
      r.route.toLowerCase().includes(q) ||
      r.dest_tc.toLowerCase().includes(q) ||
      r.dest_en.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              設定頁面：填上 STOP ID 並選擇想要的巴士路線
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              步驟 1：輸入你想追蹤的巴士站 STOP ID ➜ 步驟 2：從政府 API 載入該站所有停靠路線 ➜ 步驟 3：勾選想要在主頁顯示的路線。
            </p>
          </div>
        </div>

        {/* Current Active Config Summary */}
        {currentConfig && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                目前已設定追蹤：<strong>{currentConfig.stopName_tc}</strong> (
                <span className="font-mono">{currentConfig.stopId}</span>)，共選擇{' '}
                <strong>{currentConfig.selectedRouteKeys?.length || currentConfig.selectedRoutes.length}</strong>{' '}
                條路線。
              </span>
            </div>
            <button
              type="button"
              onClick={onGoToHome}
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>查看主頁看板</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STOP ID Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoadRoutes(stopIdInput);
          }}
          className="space-y-4 pt-2"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold">
                #
              </div>
              <input
                id="settings-stop-id-input"
                type="text"
                value={stopIdInput}
                onChange={(e) => setStopIdInput(e.target.value.trim())}
                placeholder="輸入巴士站 STOP ID (例如 A3ADFCDF8487ADB9 或 001032)..."
                className="w-full pl-9 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
              />
              {stopIdInput && (
                <button
                  type="button"
                  onClick={() => setStopIdInput('')}
                  className="absolute inset-y-0 right-2 px-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  清除
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                {(
                  [
                    { id: 'AUTO', label: '自動' },
                    { id: 'KMB', label: '九巴' },
                    { id: 'CTB', label: '城巴' },
                    { id: 'NLB', label: '嶼巴' },
                  ] as const
                ).map((co) => (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => {
                      setCompanyPref(co.id);
                      if (stopIdInput.trim()) handleLoadRoutes(stopIdInput.trim(), co.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      companyPref === co.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {co.label}
                  </button>
                ))}
              </div>

              <button
                id="btn-load-routes"
                type="submit"
                disabled={isLoading || !stopIdInput}
                className="px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>載入路線中...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>載入路線清單</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              常用車站範例：
            </span>
            {PRESET_STOPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStopIdInput(s.id);
                  setCompanyPref(s.company);
                  handleLoadRoutes(s.id, s.company);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  stopIdInput === s.id
                    ? 'bg-red-50 border-red-300 text-red-800 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {s.label} ({s.company})
              </button>
            ))}
          </div>
        </form>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Routes Selection Section */}
      {loadedStop && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-5">
          {/* Stop Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    loadedStop.company === 'KMB'
                      ? 'bg-red-600 text-white'
                      : loadedStop.company === 'CTB'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-sky-500 text-white'
                  }`}
                >
                  {loadedStop.company}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  STOP ID: <strong className="text-emerald-400">{loadedStop.stop}</strong>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black">{loadedStop.name_tc}</h3>
              {loadedStop.name_en && (
                <p className="text-xs text-slate-300">{loadedStop.name_en}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                已選取 <strong className="text-emerald-400 text-sm font-bold">{selectedRouteKeys.size}</strong> /{' '}
                {availableRoutes.length} 條路線
              </span>
            </div>
          </div>

          {/* Selection Controls & Search Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="過濾路線號碼或目的地..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>全選所有路線</span>
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>清除所有勾選</span>
              </button>
            </div>
          </div>

          {/* Routes Checkbox Grid */}
          {availableRoutes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              此巴士站暫未發現任何營運班次或途經路線。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto p-1">
              {filteredRoutes.map((routeOption) => {
                const isChecked = selectedRouteKeys.has(routeOption.key);
                return (
                  <div
                    key={routeOption.key}
                    onClick={() => handleToggleRoute(routeOption.key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                      isChecked
                        ? 'bg-red-50/80 border-red-300 ring-1 ring-red-400/50 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-red-600 text-white' : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-base text-slate-900">
                            {routeOption.route}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({routeOption.co})
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          往 {routeOption.dest_tc}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {routeOption.count} 個預計班次
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              提示：儲存後，主頁面將只為你監控並顯示<strong>已選取的 {selectedRouteKeys.size} 條路線</strong>及接下來 3 班車的實時到站時間。
            </div>

            <div className="flex items-center gap-3">
              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  已儲存設定！正在前往主頁面...
                </span>
              )}

              <button
                id="btn-save-settings"
                type="button"
                onClick={handleSave}
                disabled={selectedRouteKeys.size === 0}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>儲存設定並前往主頁面看板</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
