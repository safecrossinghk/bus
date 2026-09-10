import React from 'react';
import { Bus, Search, Hash, MapPin, Code2, Bookmark, Compass, Clock, Settings, CheckCircle2 } from 'lucide-react';

export type TabType = 'home' | 'settings' | 'lookup' | 'route' | 'favorites' | 'docs';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  stopsCount: number;
  favoritesCount: number;
  isLoadingData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stopsCount,
  favoritesCount,
  isLoadingData,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: '主頁到站看板', icon: Clock, desc: '顯示已選巴士路線接下來 3 班車' },
    { id: 'settings' as TabType, label: '設定路線', icon: Settings, desc: '填上 STOP ID 選擇路線' },
    { id: 'lookup' as TabType, label: '全站路線查詢', icon: Hash, desc: '輸入 STOP ID 查看所有路線' },
    { id: 'route' as TabType, label: '路線停站搜尋', icon: Bus, desc: '按路線號碼查看站點' },
    { id: 'favorites' as TabType, label: '我的收藏', icon: Bookmark, badge: favoritesCount, desc: '常用 STOP ID' },
    { id: 'docs' as TabType, label: 'API 指引', icon: Code2, desc: '政府開放數據規範' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-sm ring-2 ring-red-100">
              <Bus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  香港巴士實時到站時間 (ETA)
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  DATA.GOV.HK 政府開放數據
                </span>
              </div>
              <p className="text-xs text-slate-500">
                設定 STOP ID 追蹤指定巴士路線 • 實時顯示接下來 3 班車到站倒數分鐘
              </p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
              <span className={`w-2 h-2 rounded-full ${isLoadingData ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              <span>
                {isLoadingData ? '正在同步巴士站數據...' : `${stopsCount.toLocaleString()} 個九巴站點已同步`}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar pb-2 pt-1 border-t border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
