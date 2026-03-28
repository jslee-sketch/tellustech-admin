import DataTable from '../components/DataTable'

const DATA = [
  { no: 'AS-2024-001', customer: 'LG화학', site: '성남 공장', issue: '복합기 드럼 교체', priority: '보통', date: '2024-12-20', status: '완료', tech: '박민수' },
  { no: 'AS-2024-002', customer: '삼성전자', site: '수원 R&D', issue: '프린터 용지걸림 반복', priority: '긴급', date: '2024-12-21', status: '출동중', tech: '최영희' },
  { no: 'AS-2024-003', customer: 'SK하이닉스', site: '이천 공장', issue: '네트워크 스위치 장애', priority: '긴급', date: '2024-12-21', status: '접수', tech: '미배정' },
  { no: 'AS-2024-004', customer: '포스코', site: '포항 본사', issue: '복합기 토너 교체', priority: '보통', date: '2024-12-22', status: '접수', tech: '미배정' },
  { no: 'AS-2024-005', customer: '네이버', site: '춘천 IDC', issue: '서버 랙 케이블 정리', priority: '낮음', date: '2024-12-23', status: '대기', tech: '박민수' },
]

const COLS = [
  { key: 'no', label: '접수번호' },
  { key: 'customer', label: '고객사' },
  { key: 'site', label: '현장' },
  { key: 'issue', label: '증상/요청' },
  { key: 'priority', label: '우선순위', render: (v) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      v === '긴급' ? 'text-brand bg-red-50' :
      v === '보통' ? 'text-blue-600 bg-blue-50' :
      'text-gray bg-light'
    }`}>{v}</span>
  )},
  { key: 'date', label: '접수일' },
  { key: 'status', label: '상태', render: (v) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      v === '완료' ? 'text-emerald-600 bg-emerald-50' :
      v === '출동중' ? 'text-orange-600 bg-orange-50' :
      v === '접수' ? 'text-blue-600 bg-blue-50' :
      'text-gray bg-light'
    }`}>{v}</span>
  )},
  { key: 'tech', label: '담당기사' },
]

export default function AS() {
  return (
    <DataTable
      title="AS 출동관리"
      columns={COLS}
      data={DATA}
      onAdd={() => alert('AS 접수 (구현 예정)')}
    />
  )
}
