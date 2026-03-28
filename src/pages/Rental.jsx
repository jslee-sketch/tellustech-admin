import { useState } from 'react'
import DataTable from '../components/DataTable'

const OA_DATA = [
  { no: 'R-2024-001', customer: '삼성전자', model: 'HP LaserJet M438n', qty: 5, start: '2024-01-15', end: '2026-01-14', status: '진행중', manager: '김수정' },
  { no: 'R-2024-002', customer: 'LG화학', model: 'Samsung CLX-9201NA', qty: 3, start: '2024-02-01', end: '2026-01-31', status: '진행중', manager: '박민수' },
  { no: 'R-2024-003', customer: 'SK하이닉스', model: 'Samsung SCX-8240NA', qty: 8, start: '2024-03-10', end: '2025-03-09', status: '만료예정', manager: '김수정' },
  { no: 'R-2024-004', customer: '현대모비스', model: 'HP Color LJ M480f', qty: 2, start: '2023-06-01', end: '2025-05-31', status: '만료예정', manager: '최영희' },
  { no: 'R-2024-005', customer: '포스코', model: 'HP LaserJet M438n', qty: 10, start: '2024-06-01', end: '2026-05-31', status: '진행중', manager: '이정훈' },
  { no: 'R-2024-006', customer: '네이버', model: 'Samsung CLX-9201NA', qty: 4, start: '2024-07-15', end: '2026-07-14', status: '진행중', manager: '박민수' },
]

const TM_DATA = [
  { no: 'T-2024-001', customer: '삼성전기', model: 'Keysight 34461A', qty: 2, start: '2024-01-20', end: '2025-01-19', status: '진행중', manager: '이정훈' },
  { no: 'T-2024-002', customer: 'LG이노텍', model: 'Fluke 87V', qty: 5, start: '2024-03-01', end: '2025-02-28', status: '만료예정', manager: '김수정' },
  { no: 'T-2024-003', customer: 'SK텔레콤', model: 'R&S FSV3030', qty: 1, start: '2024-05-15', end: '2026-05-14', status: '진행중', manager: '이정훈' },
  { no: 'T-2024-004', customer: '한화솔루션', model: 'Keysight N9020B MXA', qty: 1, start: '2024-04-01', end: '2025-03-31', status: '만료예정', manager: '최영희' },
  { no: 'T-2024-005', customer: '삼성SDI', model: 'Advantest R3273', qty: 3, start: '2024-08-01', end: '2026-07-31', status: '진행중', manager: '박민수' },
]

const OA_COLS = [
  { key: 'no', label: '계약번호' },
  { key: 'customer', label: '고객사' },
  { key: 'model', label: '모델명' },
  { key: 'qty', label: '수량' },
  { key: 'start', label: '시작일' },
  { key: 'end', label: '종료일' },
  { key: 'status', label: '상태', render: (v) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      v === '진행중' ? 'text-emerald-600 bg-emerald-50' :
      v === '만료예정' ? 'text-amber-600 bg-amber-50' :
      'text-gray bg-light'
    }`}>{v}</span>
  )},
  { key: 'manager', label: '담당자' },
]

const TM_COLS = [...OA_COLS]

export default function Rental() {
  const [tab, setTab] = useState('oa')

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-border p-1 w-fit shadow-sm">
        <button
          onClick={() => setTab('oa')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'oa' ? 'bg-brand text-white shadow' : 'text-gray hover:text-dark'
          }`}
        >
          OA기기 (복합기)
        </button>
        <button
          onClick={() => setTab('tm')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'tm' ? 'bg-brand text-white shadow' : 'text-gray hover:text-dark'
          }`}
        >
          계측기
        </button>
      </div>

      {/* Table */}
      {tab === 'oa' ? (
        <DataTable
          title="OA기기 렌탈 현황"
          columns={OA_COLS}
          data={OA_DATA}
          onAdd={() => alert('렌탈 등록 (구현 예정)')}
        />
      ) : (
        <DataTable
          title="계측기 렌탈 현황"
          columns={TM_COLS}
          data={TM_DATA}
          onAdd={() => alert('렌탈 등록 (구현 예정)')}
        />
      )}
    </div>
  )
}
