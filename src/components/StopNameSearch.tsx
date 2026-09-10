import React, { useState, useMemo } from 'react';
import { Search, MapPin, Bus, Filter, ExternalLink, Bookmark, Sparkles, Navigation } from 'lucide-react';
import { BusStop, SavedStop } from '../types';
import { CopyButton } from './CopyButton';

interface StopNameSearchProps {
  stops: BusStop[];
  isLoading: boolean;
  onSelectStop: (stopId: string, stopName: string, company: 'KMB' | 'CTB', lat?: number, long?: number) => void;
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB') => void;
}

const QUICK_KEYWORDS = [
  '轉車站',
  '總站',
  '美孚',
  '旺角',
  '尖沙咀',
  '中環',
  '沙田市中心',
  '屯門市廣場',
  '荃灣',
  '觀塘',
  '大埔',
  '元朗',
];

export const StopNameSearch: React.FC<StopNameSearchProps> = ({
  stops,
  isLoading,
  onSelectStop,
  savedStops,
  onToggleSave,
}) => {
  const [searchTerm, setSearchTerm] = useState('美孚');
  const [onlyTerminus, setOnlyTerminus] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const filteredStops = useMemo(() => {
    if (!stops || stops.length === 0) return [];
    const q = searchTerm.trim().toLowerCase();

    return stops.filter((s) => {
      if (onlyTerminus && !s.name_tc.includes('總站') && !s.name_en.toLowerCase().includes('terminus')) {
        return false;
      }
      if (!q) return true;
      return (
        s.name_tc.toLowerCase().includes(q) ||
        s.name_en.toLowerCase().includes(q) ||
        (s.name_sc && s.name_sc.toLowerCase().includes(q)) ||
        s.stop.toLowerCase().includes(q)
      );
    });
  }, [stops, searchTerm, onlyTerminus]);

  const pagedStops = useMemo(() => {
    return filteredStops.slice(0, page * PAGE_SIZE);
  }, [filteredStops, page]);

  const hasMore = pagedStops.length < filteredStops.length;

  const isStopSaved = (stopId: string) => savedStops.some(s => s.stopId === stopId);

  // Text highlighter helper
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Header Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-red-600" />
              按巴士站名或地標關鍵字搜尋 STOP ID
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              支援繁簡中文、英文或 16 位十六進制 STOP ID 即時模糊比對
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            資料庫收錄: <span className="font-bold text-slate-800">{stops.length.toLocaleString()}</span> 個車站
          </div>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-stop-name-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="輸入站名 (例如: 美孚、沙田市中心、Telford Garden、紅磡站、A3ADFCDF...)"
            className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-md px-2 py-1"
            >
              清除
            </button>
          )}
        </div>

        {/* Quick Keyword Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            熱門地標快速鍵:
          </span>
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => {
                setSearchTerm(kw);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border ${
                searchTerm === kw
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {kw}
            </button>
          ))}

          {/* Terminus only filter checkbox */}
          <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={onlyTerminus}
              onChange={(e) => {
                setOnlyTerminus(e.target.checked);
                setPage(1);
              }}
              className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
            />
            <span>僅顯示總站 (Terminus)</span>
          </label>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div>
          找到 <span className="font-bold text-red-600">{filteredStops.length}</span> 個相關巴士站
        </div>
        <div>
          顯示第 1 至 {Math.min(pagedStops.length, filteredStops.length)} 筆
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">正在同步全港九巴站點資料庫...</p>
        </div>
      )}

      {/* Stop Cards Grid */}
      {!isLoading && pagedStops.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {pagedStops.map((stop) => {
            const isSaved = isStopSaved(stop.stop);
            return (
              <div
                key={stop.stop}
                id={`stop-card-${stop.stop}`}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {highlightMatch(stop.name_tc, searchTerm)}
                      </h3>
                      {stop.name_en && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {highlightMatch(stop.name_en, searchTerm)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                      九巴
                    </span>
                  </div>

                  {/* Coordinates & Google Map */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[11px]">
                      {stop.lat.toFixed(5)}, {stop.long.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Bottom Bar with STOP ID Spotlight and Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                      STOP ID:
                    </span>
                    <span className="font-bold text-xs tracking-wider text-emerald-400 select-all">
                      {stop.stop}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CopyButton text={stop.stop} label="複製 ID" title="複製此 STOP ID" />

                    <button
                      onClick={() => onSelectStop(stop.stop, stop.name_tc, 'KMB', stop.lat, stop.long)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="查看地圖位置、API 資訊及途經班次"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      <span>詳情</span>
                    </button>

                    <button
                      onClick={() => onToggleSave(stop.stop, stop.name_tc, stop.name_en, 'KMB')}
                      className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-amber-50 text-amber-600 border-amber-300'
                          : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200'
                      }`}
                      title={isSaved ? '已收藏' : '加入收藏'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredStops.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
          <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">找不到符合「{searchTerm}」的巴士站</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            請嘗試使用簡短的關鍵字（如「旺角」、「中環」、「沙田」），或直接切換至「路線搜尋」按路線號碼查找。
          </p>
        </div>
      )}

      {/* Load More Button */}
      {!isLoading && hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => setPage(prev => prev + 1)}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer border border-slate-300 shadow-2xs transition-colors"
          >
            載入更多站點 ({pagedStops.length} / {filteredStops.length})
          </button>
        </div>
      )}
    </div>
  );
};
