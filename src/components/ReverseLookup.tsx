import React, { useState } from 'react';
import { Hash, Search, Bus, MapPin, Clock, AlertCircle, CheckCircle2, Copy, Sparkles, RefreshCw } from 'lucide-react';
import { BusStop, EtaItem, SavedStop } from '../types';
import { getKmbStopById, getKmbStopEta, getCtbStopById, identifyStopIdFormat } from '../services/busApi';
import { CopyButton } from './CopyButton';
import { StopMap } from './StopMap';

interface ReverseLookupProps {
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB') => void;
}

const SAMPLE_STOP_IDS = [
  { id: 'A3ADFCDF8487ADB9', label: '九巴 尖沙咀碼頭', company: 'KMB' as const },
  { id: '18492910339410B1', label: '九巴 竹園邨總站', company: 'KMB' as const },
  { id: '4EB9AC6D0254CFD9', label: '九巴 美孚總站', company: 'KMB' as const },
  { id: '001027', label: '城巴 堅尼地城卑路乍街', company: 'CTB' as const },
  { id: '001001', label: '城巴 亞畢諾道中央廣場', company: 'CTB' as const },
];

export const ReverseLookup: React.FC<ReverseLookupProps> = ({
  savedStops,
  onToggleSave,
}) => {
  const [stopInput, setStopInput] = useState('A3ADFCDF8487ADB9');
  const [isLoading, setIsLoading] = useState(false);
  const [stopResult, setStopResult] = useState<BusStop | null>(null);
  const [etaResult, setEtaResult] = useState<EtaItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLookup = async (idToQuery: string) => {
    const cleanId = idToQuery.trim().toUpperCase();
    if (!cleanId) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStopResult(null);
    setEtaResult([]);
    setHasSearched(true);

    const format = identifyStopIdFormat(cleanId);

    try {
      if (format === 'KMB') {
        const stop = await getKmbStopById(cleanId);
        if (stop) {
          setStopResult(stop);
          // Try loading ETA
          try {
            const etas = await getKmbStopEta(cleanId);
            setEtaResult(etas);
          } catch {
            // ETA load fail is non-fatal
          }
        } else {
          setErrorMessage(`在九巴開放數據中找不到 STOP ID「${cleanId}」。請檢查代號是否正確。`);
        }
      } else if (format === 'CTB') {
        const stop = await getCtbStopById(cleanId);
        if (stop) {
          setStopResult(stop);
        } else {
          setErrorMessage(`在城巴開放數據中找不到 STOP ID「${cleanId}」。`);
        }
      } else {
        // Unknown format, try KMB first then CTB
        const kmbStop = await getKmbStopById(cleanId);
        if (kmbStop) {
          setStopResult(kmbStop);
          const etas = await getKmbStopEta(cleanId).catch(() => []);
          setEtaResult(etas);
        } else {
          const ctbStop = await getCtbStopById(cleanId);
          if (ctbStop) {
            setStopResult(ctbStop);
          } else {
            setErrorMessage(`無法識別或找不到 STOP ID「${cleanId}」。九巴 STOP ID 通常為 16 位十六進制字串，城巴為 6 位數字。`);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || '查詢時發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const isSaved = stopResult ? savedStops.some(s => s.stopId === stopResult.stop) : false;

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Hash className="w-5 h-5 text-red-600" />
            STOP ID 反向驗證與站點查詢
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            已有巴士站代號？在此貼上 STOP ID，即可即時查驗官方車站名稱、GPS 座標、地圖位置及當前途經路線實時抵站時間。
          </p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup(stopInput);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono">
              #
            </div>
            <input
              id="input-reverse-stop-id"
              type="text"
              value={stopInput}
              onChange={(e) => setStopInput(e.target.value.trim())}
              placeholder="貼上或輸入 STOP ID (如 A3ADFCDF8487ADB9 或 001027)..."
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-medium"
            />
          </div>

          <button
            id="btn-submit-reverse"
            type="submit"
            disabled={isLoading || !stopInput}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>查詢中...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>驗證與反查</span>
              </>
            )}
          </button>
        </form>

        {/* Format Hints & Sample Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            快速測試範例:
          </span>
          {SAMPLE_STOP_IDS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setStopInput(sample.id);
                handleLookup(sample.id);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span className={sample.company === 'KMB' ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>
                [{sample.company}]
              </span>
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{errorMessage}</div>
            <div className="text-xs text-amber-700 mt-1">
              • 九巴 / 龍運 STOP ID 格式為 16 位十六進制字元（如 <code>18492910339410B1</code>）<br />
              • 城巴 STOP ID 格式為 6 位數字（如 <code>001027</code>）
            </div>
          </div>
        </div>
      )}

      {/* Success Result View */}
      {stopResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                  {stopResult.company === 'KMB' ? '九巴 / 龍運' : '城巴'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  官方 STOP ID 驗證成功
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">{stopResult.name_tc}</h3>
              {stopResult.name_en && (
                <p className="text-sm text-slate-300 font-medium mt-0.5">{stopResult.name_en}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Highlighted STOP ID Pill */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 font-mono flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-sans">STOP ID:</span>
                <span className="font-bold text-emerald-400 text-sm tracking-wider select-all">
                  {stopResult.stop}
                </span>
              </div>

              <CopyButton text={stopResult.stop} label="複製 ID" title="複製此 STOP ID" />

              <button
                onClick={() =>
                  onToggleSave(stopResult.stop, stopResult.name_tc, stopResult.name_en, stopResult.company)
                }
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  isSaved
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                }`}
              >
                {isSaved ? '★ 已收藏' : '☆ 收藏站點'}
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Stop metadata & Map */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">車站地理資訊</h4>

              {/* Coordinates Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">緯度 (Latitude):</span>
                  <span className="font-mono font-semibold text-slate-800">{stopResult.lat}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">經度 (Longitude):</span>
                  <span className="font-mono font-semibold text-slate-800">{stopResult.long}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">地圖連結:</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${stopResult.lat},${stopResult.long}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-red-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    在 Google 地圖開啟 ↗
                  </a>
                </div>
              </div>

              {/* Leaflet Map Embed */}
              {stopResult.lat && stopResult.long && (
                <StopMap
                  lat={stopResult.lat}
                  long={stopResult.long}
                  stopName={stopResult.name_tc}
                  stopId={stopResult.stop}
                  className="h-56 w-full rounded-xl"
                />
              )}
            </div>

            {/* Right Col: Passing Routes & Real-time ETA */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-red-600" />
                  途經路線與即時到站 (ETA)
                </h4>
                <button
                  onClick={() => handleLookup(stopResult.stop)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  更新班次
                </button>
              </div>

              {etaResult.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  {stopResult.company === 'KMB'
                    ? '暫無即時到站資料或此站點目前無運作中班次。'
                    : '城巴需搭配路線編號查詢 ETA，您可以在「路線停站搜尋」分頁輸入城巴路線以查看實時班次。'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {etaResult.map((eta, index) => {
                    const etaTime = eta.eta ? new Date(eta.eta) : null;
                    const now = new Date();
                    const diffMinutes = etaTime ? Math.round((etaTime.getTime() - now.getTime()) / 60000) : null;

                    return (
                      <div
                        key={`${eta.route}-${eta.dir}-${eta.seq}-${index}`}
                        className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded-md bg-slate-900 text-white font-black text-sm flex items-center justify-center font-mono">
                            {eta.route}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">
                              往 <span className="font-bold text-slate-800 text-sm">{eta.dest_tc}</span>
                            </div>
                            {eta.rmk_tc && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                                {eta.rmk_tc}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-slate-900">
                            {diffMinutes !== null && diffMinutes >= 0 ? (
                              diffMinutes === 0 ? (
                                <span className="text-rose-600">即將抵達</span>
                              ) : (
                                <>
                                  {diffMinutes} <span className="text-xs font-normal text-slate-500">分鐘</span>
                                </>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">未能預計</span>
                            )}
                          </div>
                          {etaTime && (
                            <div className="text-[11px] font-mono text-slate-400">
                              {etaTime.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
