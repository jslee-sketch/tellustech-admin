import { useEffect, useState } from 'react'
import { IconTrendUp, IconRental, IconCalibration, IconAS, IconClipboard, IconClock, IconUsers } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const STATS = [
  { label: '렌탈 계약', value: '147', change: '+12', icon: IconRental, color: 'bg-brand' },
  { label: '재고 자산', value: '2,340', change: '+58', icon: IconClipboard, color: 'bg-blue-500' },
  { label: '교정 진행', value: '23', change: '+5', icon: IconCalibration, color: 'bg-amber-500' },
  { label: 'AS 출동', value: '8', change: '+2', icon: IconAS, color: 'bg-emerald-500' },
]

const RECENT = [
  { time: '10분 전', action: '렌탈 계약 등록', detail: '삼성전자 — HP LaserJet M438n × 5', user: '김수정' },
  { time: '25분 전', action: 'AS 출동 완료', detail: 'LG화학 성남 — 복합기 드럼 교체', user: '박민수' },
  { time: '1시간 전', action: '교정 접수', detail: 'Keysight 34461A 디지털 멀티미터', user: '이정훈' },
  { time: '2시간 전', action: '재고 입고', detail: 'Fluke 87V 산업용 멀티미터 × 20', user: '최영희' },
  { time: '3시간 전', action: '렌탈 해지', detail: '현대모비스 — Samsung CLX-9201NA × 2', user: '김수정' },
  { time: '어제', action: '교정 완료', detail: 'R&S FSV3030 스펙트럼 분석기', user: '이정훈' },
]

const ALERTS = [
  { type: '렌탈', text: '렌탈 만료 예정 3건 (7일 이내)', color: 'text-brand' },
  { type: '교정', text: '교정 기한 임박 5건', color: 'text-amber-500' },
  { type: 'AS', text: '미처리 AS 요청 2건', color: 'text-emerald-500' },
  { type: '재고', text: '안전재고 미달 품목 8건', color: 'text-blue-500' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [me, setMe] = useState(null)

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setMe(res.data))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      {me && (
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
            <IconUsers width={18} height={18} className="text-brand" />
          </div>
          <div>
            <span className="text-sm font-semibold text-dark">{me.name || user?.name}</span>
            <span className="text-xs text-gray ml-2">({me.username || user?.id})</span>
            <span className="text-xs text-gray ml-1">님, 환영합니다</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`${s.color} w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
              <s.icon width={20} height={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-gray font-medium uppercase tracking-wider">{s.label}</div>
              <div className="text-2xl font-bold text-dark mt-0.5">{s.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <IconTrendUp width={12} height={12} className="text-emerald-500" />
                <span className="text-xs text-emerald-500 font-semibold">{s.change}</span>
                <span className="text-[10px] text-gray">이번 달</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent activity */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-dark">최근 활동</h2>
            <span className="text-[11px] text-gray">오늘</span>
          </div>
          <div className="divide-y divide-border/60">
            {RECENT.map((r, i) => (
              <div key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-light/50 transition-colors">
                <div className="mt-0.5">
                  <IconClock width={14} height={14} className="text-gray/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-dark">{r.action}</span>
                    <span className="text-[11px] text-gray">{r.time}</span>
                  </div>
                  <div className="text-xs text-gray mt-0.5 truncate">{r.detail}</div>
                </div>
                <span className="text-[11px] text-gray bg-light px-2 py-0.5 rounded-full shrink-0">{r.user}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-dark">알림</h2>
          </div>
          <div className="p-4 space-y-3">
            {ALERTS.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-light rounded-lg">
                <span className={`text-[10px] font-bold ${a.color} bg-white px-2 py-0.5 rounded-full shrink-0 mt-0.5`}>
                  {a.type}
                </span>
                <span className="text-sm text-mid">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
