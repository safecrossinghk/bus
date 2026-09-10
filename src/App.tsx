import React, { useState, useEffect } from 'react';
import { Bus, Search, Hash, MapPin, Code2, Bookmark, Compass, Heart, Github, ExternalLink } from 'lucide-react';
import { BusStop, SavedStop, UserTrackedConfig } from './types';
import { getKmbStops } from './services/busApi';
import { Navbar, TabType } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { SettingsPage } from './components/SettingsPage';
import { StopEtaLookup } from './components/StopEtaLookup';
import { RouteSearch } from './components/RouteSearch';
import { ApiDocs } from './components/ApiDocs';
import { FavoritesView } from './components/FavoritesView';
import { StopDetailModal } from './components/StopDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [targetStopId, setTargetStopId] = useState<string>('A3ADFCDF8487ADB9');
  const [kmbStops, setKmbStops] = useState<BusStop[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(true);

  // User's custom tracked stop & selected routes configuration
  const [trackedConfig, setTrackedConfig] = useState<UserTrackedConfig | null>(() => {
    try {
      const stored = localStorage.getItem('hk_bus_user_tracked_config');
      if (stored) return JSON.parse(stored);
      // Default to Star Ferry Pier 1, 1A, 2 if first time, so home page is immediately useful!
      return {
        stopId: 'A3ADFCDF8487ADB9',
        stopName_tc: '尖沙咀碼頭總站',
        stopName_en: 'Star Ferry Pier',
        company: 'KMB',
        selectedRoutes: ['1', '1A', '2', '6'],
        selectedRouteKeys: ['1||竹園邨', '1A||中秀茂坪', '2||蘇屋', '6||荔枝角'],
        lastConfiguredAt: Date.now(),
      };
    } catch {
      return null;
    }
  });

  // Saved / Bookmarked Stops
  const [savedStops, setSavedStops] = useState<SavedStop[]>(() => {
    try {
      const stored = localStorage.getItem('hk_saved_bus_stops');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save config to localStorage
  useEffect(() => {
    try {
      if (trackedConfig) {
        localStorage.setItem('hk_bus_user_tracked_config', JSON.stringify(trackedConfig));
      }
    } catch {
      // ignore
    }
  }, [trackedConfig]);

  // Modal detail stop state
  const [modalStop, setModalStop] = useState<{
    stopId: string;
    name?: string;
    company: 'KMB' | 'CTB' | 'NLB';
    lat?: number;
    long?: number;
  } | null>(null);

  // Save to localStorage when savedStops updates
  useEffect(() => {
    try {
      localStorage.setItem('hk_saved_bus_stops', JSON.stringify(savedStops));
    } catch {
      // ignore
    }
  }, [savedStops]);

  // Load KMB stops on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStops(true);

    getKmbStops()
      .then((stops) => {
        if (isMounted) {
          setKmbStops(stops);
          setIsLoadingStops(false);
        }
      })
      .catch((err) => {
        console.error('Failed to preload stops:', err);
        if (isMounted) setIsLoadingStops(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle Save Stop
  const handleToggleSave = (
    stopId: string,
    name_tc: string,
    name_en: string,
    company: 'KMB' | 'CTB' | 'NLB'
  ) => {
    setSavedStops((prev) => {
      const exists = prev.some((s) => s.stopId === stopId);
      if (exists) {
        return prev.filter((s) => s.stopId !== stopId);
      } else {
        const newItem: SavedStop = {
          id: `${company}-${stopId}-${Date.now()}`,
          stopId,
          name_tc,
          name_en,
          company,
          savedAt: Date.now(),
        };
        return [newItem, ...prev];
      }
    });
  };

  const handleUpdateNote = (stopId: string, note: string) => {
    setSavedStops((prev) =>
      prev.map((s) => (s.stopId === stopId ? { ...s, note } : s))
    );
  };

  const handleRemoveFavorite = (stopId: string) => {
    setSavedStops((prev) => prev.filter((s) => s.stopId !== stopId));
  };

  const handleOpenStopModal = (
    stopId: string,
    stopName: string,
    company: 'KMB' | 'CTB' | 'NLB',
    lat?: number,
    long?: number
  ) => {
    setModalStop({
      stopId,
      name: stopName,
      company,
      lat,
      long,
    });
  };

  const handleGoToEta = (stopId: string) => {
    setTargetStopId(stopId);
    setActiveTab('lookup');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-red-100 selection:text-red-900">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stopsCount={kmbStops.length}
        favoritesCount={savedStops.length}
        isLoadingData={isLoadingStops}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'home' && (
          <HomeDashboard
            config={trackedConfig}
            onGoToSettings={() => setActiveTab('settings')}
            onApplyPreset={(cfg) => {
              setTrackedConfig(cfg);
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            currentConfig={trackedConfig}
            onSaveConfig={(cfg) => {
              setTrackedConfig(cfg);
            }}
            onGoToHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'lookup' && (
          <StopEtaLookup
            initialStopId={targetStopId}
            savedStops={savedStops}
            onToggleSave={handleToggleSave}
            onNavigateToRouteSearch={() => setActiveTab('route')}
          />
        )}

        {activeTab === 'route' && (
          <RouteSearch
            onSelectStop={handleOpenStopModal}
            savedStops={savedStops}
            onToggleSave={handleToggleSave}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            savedStops={savedStops}
            onRemove={handleRemoveFavorite}
            onSelectStop={(stopId) => handleGoToEta(stopId)}
            onUpdateNote={handleUpdateNote}
            onNavigateToSearch={() => setActiveTab('route')}
          />
        )}

        {activeTab === 'docs' && <ApiDocs />}
      </main>

      {/* Stop Detail Modal */}
      {modalStop && (
        <StopDetailModal
          stopId={modalStop.stopId}
          initialName={modalStop.name}
          initialCompany={modalStop.company}
          initialLat={modalStop.lat}
          initialLong={modalStop.long}
          onClose={() => setModalStop(null)}
          savedStops={savedStops}
          onToggleSave={handleToggleSave}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-600 text-white flex items-center justify-center font-bold text-[10px]">
              K
            </div>
            <span>
              <strong>香港巴士站 STOP ID 查詢工具</strong> • 開放數據來自{' '}
              <a
                href="https://data.gov.hk"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 hover:underline"
              >
                DATA.GOV.HK
              </a>{' '}
              及{' '}
              <a
                href="https://data.etabus.gov.hk"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 hover:underline"
              >
                九巴開放數據 (ETABUS)
              </a>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>支援九巴 (KMB)、龍運 (LWB) 及城巴 (Citybus) 路線</span>
            <button
              onClick={() => setActiveTab('docs')}
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
            >
              API 開發者指引 ↗
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
