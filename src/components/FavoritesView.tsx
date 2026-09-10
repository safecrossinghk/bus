import React from 'react';
import { Bookmark, Trash2, MapPin, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { SavedStop } from '../types';
import { CopyButton } from './CopyButton';

interface FavoritesViewProps {
  savedStops: SavedStop[];
  onRemove: (stopId: string) => void;
  onSelectStop: (stopId: string, stopName: string, company: 'KMB' | 'CTB') => void;
  onUpdateNote: (stopId: string, note: string) => void;
  onNavigateToSearch: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  savedStops,
  onRemove,
  onSelectStop,
  onUpdateNote,
  onNavigateToSearch,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500" />
            我收藏的巴士站 STOP ID ({savedStops.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            保存在瀏覽器本機儲存空間，隨時一鍵複製代碼或查詢實時到站班次
          </p>
        </div>

        {savedStops.length > 0 && (
          <div className="text-xs text-slate-500">
            已收藏 {savedStops.length} 個站點
          </div>
        )}
      </div>

      {savedStops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">尚未收藏任何巴士站</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            在「路線搜尋」、「站名關鍵字」或「反向查詢」中點擊站點旁的星號/書籤圖示，即可將常用站點的 STOP ID 儲存在此處。
          </p>
          <button
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs transition-colors"
          >
            前往搜尋巴士站
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedStops.map((item) => (
            <div
              key={item.stopId}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.name_tc}</h3>
                    {item.name_en && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{item.name_en}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                    {item.company}
                  </span>
                </div>

                {/* Optional Note input */}
                <div className="mt-2 mb-3">
                  <input
                    type="text"
                    defaultValue={item.note || ''}
                    placeholder="點擊輸入自訂備註 (如: 屋企樓下、公司對面、轉車站牌)..."
                    onBlur={(e) => onUpdateNote(item.stopId, e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Bottom Spotlight & Controls */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                    STOP ID:
                  </span>
                  <span className="font-bold text-xs tracking-wider text-emerald-400 select-all">
                    {item.stopId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CopyButton text={item.stopId} label="複製 ID" title="複製此 STOP ID" />

                  <button
                    onClick={() => onSelectStop(item.stopId, item.name_tc, item.company)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="查看此站實時班次及地圖位置"
                  >
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                    <span>即時班次</span>
                  </button>

                  <button
                    onClick={() => onRemove(item.stopId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 transition-colors cursor-pointer text-xs"
                    title="移除收藏"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
