import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Bookmark, ExternalLink, Code2, RefreshCw, Check, Bus } from 'lucide-react';
import { BusStop, EtaItem, SavedStop } from '../types';
import { getKmbStopById, getKmbStopEta, getCtbStopById, getCtbStopBatchEta } from '../services/busApi';
import { CopyButton } from './CopyButton';
import { StopMap } from './StopMap';

interface StopDetailModalProps {
  stopId: string | null;
  initialName?: string;
  initialCompany?: 'KMB' | 'CTB' | 'NLB';
  initialLat?: number;
  initialLong?: number;
  onClose: () => void;
  savedStops: SavedStop[];
  onToggleSave: (stopId: string, name_tc: string, name_en: string, company: 'KMB' | 'CTB' | 'NLB') => void;
}

export const StopDetailModal: React.FC<StopDetailModalProps> = ({
  stopId,
  initialName,
  initialCompany = 'KMB',
  initialLat,
  initialLong,
  onClose,
  savedStops,
  onToggleSave,
}) => {
  const [stop, setStop] = useState<BusStop | null>(null);
  const [etas, setEtas] = useState<EtaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stopId) return;

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        let stopData: BusStop | null = null;
        if (initialCompany === 'KMB') {
          stopData = await getKmbStopById(stopId);
        } else {
          stopData = await getCtbStopById(stopId);
        }

        if (isMounted && stopData) {
          setStop(stopData);
        } else if (isMounted) {
          // Fallback with provided coords
          setStop({
            stop: stopId,
            name_tc: initialName || `巴士站 ${stopId}`,
            name_en: '',
            lat: initialLat || 22.3193,
            long: initialLong || 114.1694,
            company: initialCompany,
          });
        }

        // Fetch ETA for all routes
        if (initialCompany === 'KMB') {
          const etaData = await getKmbStopEta(stopId).catch(() => []);
          if (isMounted) setEtas(etaData);
        } else if (initialCompany === 'CTB') {
          const batchRes = await getCtbStopBatchEta(stopId).catch(() => ({ etas: [] }));
          if (isMounted) setEtas(batchRes.etas);
        }
      } catch (err) {
        console.error('Error in modal load:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [stopId, initialCompany, initialName, initialLat, initialLong]);

  if (!stopId) return null;

  const currentStopName = stop?.name_tc || initialName || `站點 ${stopId}`;
  const currentStopEn = stop?.name_en || '';
  const currentLat = stop?.lat || initialLat || 22.3193;
  const currentLong = stop?.long || initialLong || 114.1694;
  const isSaved = savedStops.some((s) => s.stopId === stopId);

  const etaApiUrl =
    initialCompany === 'KMB'
      ? `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`
      : `https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${stopId}`;

  return (
    <div
      id="stop-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="stop-detail-modal-content"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                {initialCompany === 'KMB' ? '九巴 / 龍運' : '城巴'}
              </span>
              <span className="text-xs text-slate-400 font-mono">巴士站詳細資訊</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">{currentStopName}</h3>
            {currentStopEn && (
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">{currentStopEn}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight STOP ID Bar */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">
              STOP ID:
            </span>
            <code className="text-emerald-400 font-bold font-mono text-sm tracking-wide select-all bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
              {stopId}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <CopyButton text={stopId} label="複製 STOP ID" showText={true} />
            <button
              onClick={() => onToggleSave(stopId, currentStopName, currentStopEn, initialCompany)}
              className={`px-3 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                isSaved
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? '已收藏' : '收藏'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Coordinates & Map Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                地理位置與地圖
              </h4>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLong}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1"
              >
                <span>在 Google 地圖開啟</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <StopMap
              lat={currentLat}
              long={currentLong}
              stopName={currentStopName}
              stopId={stopId}
              className="h-56 w-full rounded-xl"
            />
          </div>

          {/* Real-time ETA Section */}
          {initialCompany === 'KMB' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-600" />
                途經班次即時到站時間 (ETA)
              </h4>

              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                  <span>載入即時班次中...</span>
                </div>
              ) : etas.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                  暫無即時抵站資料或此站目前非營運時段。
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {etas.map((eta, idx) => {
                    const etaTime = eta.eta ? new Date(eta.eta) : null;
                    const now = new Date();
                    const diffMinutes = etaTime
                      ? Math.round((etaTime.getTime() - now.getTime()) / 60000)
                      : null;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-7 bg-slate-900 text-white rounded font-mono font-black text-xs flex items-center justify-center">
                            {eta.route}
                          </span>
                          <div>
                            <span className="text-slate-500">往 </span>
                            <strong className="text-slate-800 font-semibold">{eta.dest_tc}</strong>
                            {eta.rmk_tc && (
                              <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                {eta.rmk_tc}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">
                            {diffMinutes !== null && diffMinutes >= 0 ? (
                              diffMinutes === 0 ? (
                                <span className="text-rose-600">即將抵達</span>
                              ) : (
                                `${diffMinutes} 分鐘`
                              )
                            ) : (
                              '未有預計'
                            )}
                          </span>
                          {etaTime && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {etaTime.toLocaleTimeString('zh-HK', {
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
              )}
            </div>
          )}

          {/* Developer Quick Copy */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-slate-600" />
              開發者開放數據 API 調用網址
            </h4>
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-700">
              <span className="truncate pr-2">{etaApiUrl}</span>
              <CopyButton text={etaApiUrl} label="複製 API URL" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
