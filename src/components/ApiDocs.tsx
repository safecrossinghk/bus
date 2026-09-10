import React, { useState } from 'react';
import { Code2, Terminal, ExternalLink, Play, Check, Copy } from 'lucide-react';
import { CopyButton } from './CopyButton';

export const ApiDocs: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python' | 'shortcuts'>('curl');
  const [testStopId, setTestStopId] = useState('A3ADFCDF8487ADB9');
  const [testCompany, setTestCompany] = useState<'KMB' | 'CTB'>('KMB');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const kmbEtaUrl = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${testStopId}`;
  const kmbStopUrl = `https://data.etabus.gov.hk/v1/transport/kmb/stop/${testStopId}`;

  const ctbEtaUrl = `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${testStopId === 'A3ADFCDF8487ADB9' ? '001027' : testStopId}/1`;
  const ctbStopUrl = `https://rt.data.gov.hk/v2/transport/citybus/stop/${testStopId === 'A3ADFCDF8487ADB9' ? '001027' : testStopId}`;

  const currentApiUrl = testCompany === 'KMB' ? kmbEtaUrl : ctbEtaUrl;

  const handleTestApi = async () => {
    setIsTesting(true);
    setApiResponse(null);
    try {
      const res = await fetch(currentApiUrl);
      const json = await res.json();
      setApiResponse(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setApiResponse(`API 請求失敗: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getCodeSnippet = () => {
    if (activeLang === 'curl') {
      return `# 1. 取得指定 STOP ID 的所有實時到站班次 (KMB ETA)
curl -X GET "${kmbEtaUrl}"

# 2. 取得巴士站基本資訊 (站名、經緯度)
curl -X GET "${kmbStopUrl}"`;
    }

    if (activeLang === 'js') {
      return `// JavaScript (Fetch / Node.js)
const STOP_ID = "${testStopId}";

async function getBusStopEta(stopId) {
  const url = \`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/\${stopId}\`;
  const response = await fetch(url);
  const result = await response.json();

  // 取得此站所有即將抵達的班次
  result.data.forEach(item => {
    console.log(\`路線: \${item.route} | 往: \${item.dest_tc} | 預計時間: \${item.eta}\`);
  });
}

getBusStopEta(STOP_ID);`;
    }

    if (activeLang === 'python') {
      return `# Python (requests)
import requests

STOP_ID = "${testStopId}"
url = f"https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/{STOP_ID}"

response = requests.get(url)
data = response.json()

for item in data.get("data", []):
    route = item.get("route")
    dest = item.get("dest_tc")
    eta = item.get("eta")
    remark = item.get("rmk_tc") or "正常"
    print(f"路線: {route} -> {dest} | 到站時間: {eta} ({remark})")`;
    }

    return `// iOS 捷徑 (Apple Shortcuts) 設定指引
1. 在 iPhone 打開「捷徑」App，新增一個捷徑
2. 加入「取得 URL 的內容」動作
   - URL: https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${testStopId}
   - 方法: GET
3. 加入「從輸入取得辭典值」動作
   - 鍵值設為: data
4. 加入「重複每個項目」動作
   - 取得「route」(路線) 與「eta」(抵達時間)
5. 加入「顯示通知」動作，即可一鍵查看巴士到站！`;
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-red-600" />
              香港巴士開放數據 STOP ID 規格與開發者指南
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              香港特區政府「資料一線通 (DATA.GOV.HK)」及九巴開放數據平台 API 調用標準
            </p>
          </div>
          <a
            href="https://data.gov.hk/tc-data/dataset/hk-td-tis_21-routes-and-fares-xml-data"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <span>官方資料庫</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Specifications comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* KMB Spec */}
          <div className="bg-red-50/50 border border-red-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-red-900">九巴 / 龍運 (KMB / LWB)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                16 位十六進制 (HEX)
              </span>
            </div>
            <p className="text-xs text-slate-600">
              每個巴士站均有全港唯一的 16 位十六進制代碼（例如 <code>A3ADFCDF8487ADB9</code> 尖沙咀碼頭）。
            </p>
            <div className="text-xs font-mono bg-white p-2 rounded border border-red-200 text-slate-700">
              https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/<strong>{'{STOP_ID}'}</strong>
            </div>
            <p className="text-[11px] text-slate-500">
              ✓ 無需 API Key，開放 CORS，全球皆可直接 Fetch。<br />
              ✓ 支援單一 STOP ID 查詢該站所有路線之 ETA。
            </p>
          </div>

          {/* CTB Spec */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-900">城巴 (Citybus)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                6 位數字編號
              </span>
            </div>
            <p className="text-xs text-slate-600">
              城巴站點使用 6 位純數字編號（例如 <code>001027</code> 堅尼地城卑路乍街）。
            </p>
            <div className="text-xs font-mono bg-white p-2 rounded border border-amber-200 text-slate-700">
              https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/<strong>{'{STOP_ID}'}</strong>/<strong>{'{ROUTE}'}</strong>
            </div>
            <p className="text-[11px] text-slate-500">
              ✓ 無需 API Key，開放 CORS。<br />
              ✓ 城巴 ETA API 需同時傳入 STOP ID 與 ROUTE 號碼。
            </p>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60 gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">程式代碼調用範例</span>
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'curl', label: 'cURL' },
              { id: 'js', label: 'JavaScript' },
              { id: 'python', label: 'Python' },
              { id: 'shortcuts', label: 'iOS 捷徑' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveLang(t.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  activeLang === t.id
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 relative">
          <div className="absolute top-4 right-4 z-10">
            <CopyButton text={getCodeSnippet()} label="複製代碼" showText={true} />
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 leading-relaxed">
            <code>{getCodeSnippet()}</code>
          </pre>
        </div>
      </div>

      {/* Interactive API Playground */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              即時 API 測試沙盒 (Live API Sandbox)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              直接點擊「執行請求」即可檢視官方 Open Data 返回的原始 JSON 數據結構
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 flex-1 overflow-x-auto">
            <span className="font-bold text-emerald-600">GET</span>
            <span className="truncate">{currentApiUrl}</span>
          </div>

          <button
            onClick={handleTestApi}
            disabled={isTesting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isTesting ? '請求中...' : '執行請求 (Test)'}</span>
          </button>
        </div>

        {apiResponse && (
          <div className="mt-4 bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-300 max-h-72 overflow-y-auto border border-slate-800">
            <pre>
              <code>{apiResponse}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
