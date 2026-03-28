import { useState } from 'react'
import { IconSearch, IconPlus, IconEdit, IconCopy, IconTrash } from './icons'

export default function DataTable({ columns, data, onAdd, title }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())

  const filtered = data.filter(row =>
    columns.some(col =>
      String(row[col.key] ?? '').toLowerCase().includes(search.toLowerCase())
    )
  )

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((_, i) => i)))
  }
  const toggle = (i) => {
    const s = new Set(selected)
    s.has(i) ? s.delete(i) : s.add(i)
    setSelected(s)
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {title && <h2 className="text-sm font-bold text-dark">{title}</h2>}
          <span className="text-xs text-gray bg-light px-2 py-0.5 rounded-full">{filtered.length}건</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <IconSearch width={15} height={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray" />
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-52 pl-8 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-light"
            />
          </div>
          <div className="flex gap-1">
            <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-light transition-colors">
              <IconPlus width={14} height={14} />
              <span className="hidden sm:inline">추가</span>
            </button>
            <button className="p-2 text-gray hover:text-brand hover:bg-brand/5 rounded-lg transition-colors" title="수정">
              <IconEdit width={14} height={14} />
            </button>
            <button className="p-2 text-gray hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="복사">
              <IconCopy width={14} height={14} />
            </button>
            <button className="p-2 text-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
              <IconTrash width={14} height={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-light/60">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="accent-brand" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
              </th>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-gray text-sm">데이터가 없습니다</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className={`border-b border-border/60 hover:bg-light/50 transition-colors ${selected.has(i) ? 'bg-brand/3' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-brand" checked={selected.has(i)} onChange={() => toggle(i)} />
                </td>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-dark whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
