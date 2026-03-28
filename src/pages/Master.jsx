import { useState } from 'react'
import DataTable from '../components/DataTable'

const CUSTOMER_DATA = [
  { code: 'C-001', name: '삼성전자', biz: '전자', contact: '이영수', phone: '02-2255-0114', address: '서울 서초구 서초대로', status: '활성' },
  { code: 'C-002', name: 'LG화학', biz: '화학', contact: '김지영', phone: '02-3773-1114', address: '서울 영등포구 여의대로', status: '활성' },
  { code: 'C-003', name: 'SK하이닉스', biz: '반도체', contact: '박준형', phone: '031-630-4114', address: '경기 이천시 부발읍', status: '활성' },
  { code: 'C-004', name: '현대모비스', biz: '자동차부품', contact: '최서연', phone: '02-2018-5114', address: '서울 강남구 테헤란로', status: '비활성' },
  { code: 'C-005', name: '포스코', biz: '철강', contact: '정민호', phone: '054-220-0114', address: '경북 포항시 남구', status: '활성' },
]

const EMPLOYEE_DATA = [
  { code: 'E-001', name: '김수정', dept: '영업팀', role: '대리', phone: '010-1234-5678', email: 'ksj@tellustech.co.kr', status: '재직' },
  { code: 'E-002', name: '박민수', dept: 'AS팀', role: '주임', phone: '010-2345-6789', email: 'pms@tellustech.co.kr', status: '재직' },
  { code: 'E-003', name: '이정훈', dept: '교정팀', role: '과장', phone: '010-3456-7890', email: 'ljh@tellustech.co.kr', status: '재직' },
  { code: 'E-004', name: '최영희', dept: '영업팀', role: '사원', phone: '010-4567-8901', email: 'cyh@tellustech.co.kr', status: '재직' },
]

const ASSET_DATA = [
  { code: 'A-001', category: '계측기', name: 'Keysight 34461A', brand: 'Keysight', unit: 'EA', rental: '가능', note: '디지털 멀티미터' },
  { code: 'A-002', category: '계측기', name: 'Fluke 87V', brand: 'Fluke', unit: 'EA', rental: '가능', note: '산업용 멀티미터' },
  { code: 'A-003', category: 'OA기기', name: 'HP LaserJet M438n', brand: 'HP', unit: 'EA', rental: '가능', note: '흑백레이저' },
  { code: 'A-004', category: 'RF부품', name: 'N-SMA Cable 1m', brand: 'Huber+Suhner', unit: 'EA', rental: '불가', note: 'RF 케이블 어셈블리' },
]

const TABS = [
  {
    key: 'customer', label: '고객사',
    columns: [
      { key: 'code', label: '코드' }, { key: 'name', label: '고객사명' }, { key: 'biz', label: '업종' },
      { key: 'contact', label: '담당자' }, { key: 'phone', label: '연락처' }, { key: 'address', label: '주소' },
      { key: 'status', label: '상태', render: (v) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v === '활성' ? 'text-emerald-600 bg-emerald-50' : 'text-gray bg-light'}`}>{v}</span>
      )},
    ],
    data: CUSTOMER_DATA,
  },
  {
    key: 'employee', label: '직원',
    columns: [
      { key: 'code', label: '사번' }, { key: 'name', label: '이름' }, { key: 'dept', label: '부서' },
      { key: 'role', label: '직급' }, { key: 'phone', label: '연락처' }, { key: 'email', label: '이메일' },
      { key: 'status', label: '상태', render: (v) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v === '재직' ? 'text-emerald-600 bg-emerald-50' : 'text-gray bg-light'}`}>{v}</span>
      )},
    ],
    data: EMPLOYEE_DATA,
  },
  {
    key: 'asset', label: '자산',
    columns: [
      { key: 'code', label: '코드' }, { key: 'category', label: '분류' }, { key: 'name', label: '품명' },
      { key: 'brand', label: '브랜드' }, { key: 'unit', label: '단위' },
      { key: 'rental', label: '렌탈', render: (v) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v === '가능' ? 'text-blue-600 bg-blue-50' : 'text-gray bg-light'}`}>{v}</span>
      )},
      { key: 'note', label: '비고' },
    ],
    data: ASSET_DATA,
  },
]

export default function Master() {
  const [tab, setTab] = useState('customer')
  const current = TABS.find(t => t.key === tab)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white rounded-xl border border-border p-1 w-fit shadow-sm">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key ? 'bg-brand text-white shadow' : 'text-gray hover:text-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DataTable
        title={`${current.label} 관리`}
        columns={current.columns}
        data={current.data}
        onAdd={() => alert(`${current.label} 등록 (구현 예정)`)}
      />
    </div>
  )
}
