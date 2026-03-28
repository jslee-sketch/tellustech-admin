import DataTable from '../components/DataTable'

const DATA = [
  { no: 'CAL-2024-001', equipment: 'Keysight 34461A', serial: 'MY54321012', customer: '삼성전기', received: '2024-12-01', due: '2024-12-20', status: '완료', tech: '이정훈' },
  { no: 'CAL-2024-002', equipment: 'Fluke 87V', serial: 'FL98765432', customer: 'LG이노텍', received: '2024-12-10', due: '2024-12-25', status: '진행중', tech: '이정훈' },
  { no: 'CAL-2024-003', equipment: 'R&S FSV3030', serial: 'RS11223344', customer: 'SK텔레콤', received: '2024-12-12', due: '2024-12-28', status: '진행중', tech: '박민수' },
  { no: 'CAL-2024-004', equipment: 'Advantest R3273', serial: 'AD55667788', customer: '삼성SDI', received: '2024-12-15', due: '2025-01-05', status: '접수', tech: '미배정' },
  { no: 'CAL-2024-005', equipment: 'Keysight N9020B', serial: 'MY99887766', customer: '한화솔루션', received: '2024-12-18', due: '2025-01-08', status: '접수', tech: '미배정' },
]

const COLS = [
  { key: 'no', label: '접수번호' },
  { key: 'equipment', label: '장비명' },
  { key: 'serial', label: 'S/N' },
  { key: 'customer', label: '고객사' },
  { key: 'received', label: '접수일' },
  { key: 'due', label: '납기일' },
  { key: 'status', label: '상태', render: (v) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      v === '완료' ? 'text-emerald-600 bg-emerald-50' :
      v === '진행중' ? 'text-blue-600 bg-blue-50' :
      'text-amber-600 bg-amber-50'
    }`}>{v}</span>
  )},
  { key: 'tech', label: '담당기술자' },
]

export default function Calibration() {
  return (
    <DataTable
      title="교정 관리"
      columns={COLS}
      data={DATA}
      onAdd={() => alert('교정 접수 (구현 예정)')}
    />
  )
}
