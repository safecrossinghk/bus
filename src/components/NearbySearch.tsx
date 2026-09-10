import React, { useState } from 'react';
import { Compass, MapPin, Navigation, AlertCircle, RefreshCw, Bookmark, Sparkles } from 'lucide-react';
import { BusStop, SavedStop } from '../types';
import { calculateDistance, formatDistance } from '../services/busApi';
import { CopyButton } from './CopyButton';

interface NearbySearchProps {
  stops: BusStop[];
  isLoadingStops: boolean;
  onSelectStop: (stopId: string, stopName: string, company: 'KMB' | 'CTB', lat?: number, long?: number) => void;
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB') => void;
}

const PRESET_LOCATIONS = [
  { name: '美孚巴士總站', lat: 22.3364, long: 114.1396 },
  { name: '尖沙咀天星碼頭', lat: 22.2938, long: 114.1687 },
  { name: '中環交易廣場', lat: 22.2835, long: 114.1578 },
  { name: '旺角西洋菜南街', lat: 22.3193, long: 114.1705 },
  { name: '沙田市中心總站', lat: 22.3815, long: 114.1882 },
  { name: '屯門市廣場總站', lat: 22.3932, long: 113.9754 },
];

export const NearbySearch: React.FC<NearbySearchProps> = ({
  stops,
  isLoadingStops,
  onSelectStop,
  savedStops,
  onToggleSave,
}) => {
  const [currentLat, setCurrentLat] = useState<number | null>(22.3364);
  const [currentLong, setCurrentLong] = useState<number | null>(114.1396);
  const [locationName, setLocationName] = useState<string>('美孚巴士總站 (預設測試地點)');
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [maxRadius, setMaxRadius] = useState<number>(1000); // 1000m

  // Request browser geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('您的瀏覽器不支援地理位置定位功能。');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setCurrentLat(pos.coords.latitude);
        setCurrentLong(pos.coords.longitude);
        setLocationName('您目前的 GPS 位置');
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setGeoError('定位權限已被拒絕。您可以點選下方的熱門預設地點進行測試。');
        } else {
          setGeoError(`無法取得定位 (${err.message})。您可以選擇預設地點進行測試。`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Compute nearest stops sorted by distance
  const nearestStops = React.useMemo(() => {
    if (!currentLat || !currentLong || stops.length === 0) return [];

    const computed = stops.map((s) => ({
      ...s,
      distance: calculateDistance(currentLat, currentLong, s.lat, s.long),
    }));

    // Filter within radius and sort ascending
    return computed
      .filter((s) => s.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);
  }, [currentLat, currentLong, stops, maxRadius]);

  const isStopSaved = (stopId: string) => savedStops.some((s) => s.stopId === stopId);

  return (
    <div className="space-y-6">
      {/* Location Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-red-600" />
              搜尋附近的巴士站與 STOP ID
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              自動計算步行距離，找出方圓以內所有九巴車站及對應代碼
            </p>
          </div>

          {/* GPS Locate Button */}
          <button
            id="btn-locate-gps"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            {isLocating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>定位中...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>取得目前 GPS 位置</span>
              </>
            )}
          </button>
        </div>

        {/* Current Anchor Location Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              中心基準點：<strong className="text-slate-900">{locationName}</strong>
              {currentLat && currentLong && (
                <span className="font-mono text-slate-500 ml-1">
                  ({currentLat.toFixed(5)}, {currentLong.toFixed(5)})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">搜尋半徑:</span>
            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value={300}>300 米以內</option>
              <option value={500}>500 米以內</option>
              <option value={1000}>1 公里以內</option>
              <option value={2000}>2 公里以內</option>
            </select>
          </div>
        </div>

        {/* Preset Locations Quick Chips */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            快速切換測試地點:
          </span>
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                setCurrentLat(loc.lat);
                setCurrentLong(loc.long);
                setLocationName(loc.name);
                setGeoError(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border ${
                locationName === loc.name
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Geolocation error message if any */}
      {geoError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div>
          在 {locationName} {maxRadius} 米範圍內找到{' '}
          <span className="font-bold text-red-600">{nearestStops.length}</span> 個巴士站
        </div>
      </div>

      {/* Stops List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {nearestStops.map((stop) => {
          const isSaved = isStopSaved(stop.stop);
          return (
            <div
              key={stop.stop}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {stop.name_tc}
                    </h3>
                    {stop.name_en && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{stop.name_en}</p>
                    )}
                  </div>
                  {/* Distance badge */}
                  <div className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Navigation className="w-3 h-3 rotate-45 text-emerald-600" />
                    <span>{formatDistance(stop.distance || 0)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {stop.lat.toFixed(5)}, {stop.long.toFixed(5)}
                  </span>
                </div>
              </div>

              {/* Bottom Spotlight Bar */}
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
                    title="查看地圖位置與途經路線"
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

      {nearestStops.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">在此半徑範圍內未找到巴士站</p>
          <p className="text-xs text-slate-500 mt-1">
            請嘗試增加搜尋半徑（例如擴展至 1 或 2 公里）或點選其他地點。
          </p>
        </div>
      )}
    </div>
  );
};
