import DataTable from '../components/DataTable'

const DATA = [
  { code: 'INV-001', category: '계측기', name: 'Keysight 34461A 디지털 멀티미터', stock: 15, reserved: 3, location: '성남 본사', updated: '2024-12-20' },
  { code: 'INV-002', category: '계측기', name: 'Fluke 87V 산업용 멀티미터', stock: 42, reserved: 8, location: '성남 본사', updated: '2024-12-19' },
  { code: 'INV-003', category: '계측기', name: 'R&S FSV3030 스펙트럼 분석기', stock: 3, reserved: 1, location: '서울 사무소', updated: '2024-12-18' },
  { code: 'INV-004', category: 'RF부품', name: 'Huber+Suhner N-SMA 케이블 1m', stock: 230, reserved: 50, location: '성남 본사', updated: '2024-12-20' },
  { code: 'INV-005', category: 'OA기기', name: 'HP LaserJet M438n', stock: 18, reserved: 5, location: '성남 본사', updated: '2024-12-17' },
  { code: 'INV-006', category: 'OA기기', name: 'Samsung CLX-9201NA', stock: 7, reserved: 2, location: '서울 사무소', updated: '2024-12-20' },
  { code: 'INV-007', category: '소모품', name: 'HP 정품토너 CF258A', stock: 85, reserved: 0, location: '성남 본사', updated: '2024-12-15' },
  { code: 'INV-008', category: '네트워크', name: 'Cisco Catalyst 9200L-24P', stock: 5, reserved: 2, location: '서울 사무소', updated: '2024-12-19' },
]

const COLS = [
  { key: 'code', label: '자산코드' },
  { key: 'category', label: '분류', render: (v) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      v === '계측기' ? 'text-blue-600 bg-blue-50' :
      v === 'RF부품' ? 'text-purple-600 bg-purple-50' :
      v === 'OA기기' ? 'text-emerald-600 bg-emerald-50' :
      v === '네트워크' ? 'text-orange-600 bg-orange-50' :
      'text-gray bg-light'
    }`}>{v}</span>
  )},
  { key: 'name', label: '품명' },
  { key: 'stock', label: '재고', render: (v) => (
    <span className={v < 10 ? 'text-brand font-bold' : ''}>{v}</span>
  )},
  { key: 'reserved', label: '예약' },
  { key: 'location', label: '위치' },
  { key: 'updated', label: '최종수정' },
]

export default function Inventory() {
  return (
    <DataTable
      title="재고 현황"
      columns={COLS}
      data={DATA}
      onAdd={() => alert('재고 등록 (구현 예정)')}
    />
  )
}
