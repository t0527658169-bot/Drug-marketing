import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import drugs from './data/drugs.json'
import './App.css'

const columns = [
  { key: 'שם התרופה', label: 'שם התרופה' },
  { key: 'Drug Name', label: 'Drug Name' },
  { key: 'סיבת הפסקת השיווק', label: 'סיבת הפסקת השיווק' },
  { key: 'מרכיב פעיל', label: 'מרכיב פעיל' },
  { key: 'צפי לחידוש השיווק', label: 'צפי לחידוש השיווק' },
  { key: 'מועד תחילת הפסקת השימוש', label: 'מועד תחילת הפסקת השימוש' },
  { key: 'קבלת הודעה', label: 'קבלת הודעה' },
]

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function App() {
  const [search, setSearch] = useState('')
  const [selectedReason, setSelectedReason] = useState('all')
  const [noticeDate, setNoticeDate] = useState('')

  const reasonOptions = useMemo(
    () => ['all', ...new Set(drugs.map((item) => item['סיבת הפסקת השיווק']))],
    [],
  )

  const filteredRows = useMemo(() => {
    return drugs.filter((item) => {
      const searchText = search.trim().toLowerCase()
      const matchesSearch =
        !searchText ||
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchText),
        )

      const matchesReason =
        selectedReason === 'all' || item['סיבת הפסקת השיווק'] === selectedReason

      const itemDate = item['קבלת הודעה']
      const matchesNoticeDate = !noticeDate || itemDate === noticeDate

      return matchesSearch && matchesReason && matchesNoticeDate
    })
  }, [noticeDate, search, selectedReason])

  const exportRows = filteredRows.map((item) => ({
    'שם התרופה': item['שם התרופה'],
    'Drug Name': item['Drug Name'],
    'סיבת הפסקת השיווק': item['סיבת הפסקת השיווק'],
    'מרכיב פעיל': item['מרכיב פעיל'],
    'צפי לחידוש השיווק': formatDate(item['צפי לחידוש השיווק']),
    'מועד תחילת הפסקת השימוש': formatDate(item['מועד תחילת הפסקת השימוש']),
    'קבלת הודעה': formatDate(item['קבלת הודעה']),
  }))

  const exportWorkbook = (fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 28 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'שיווק תרופות')
    XLSX.writeFile(workbook, fileName)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="title-box">
          <span className="eyebrow">Drug Monitor</span>
          <h1>מאגר תרופות · הפסקות שיווק</h1>
        </div>

        <div className="header-actions">
          <span className="update-badge">עדכון יומי · 06:00</span>
          <button type="button" onClick={() => exportWorkbook('שיווק_תרופות.xlsx')}>
            ייצא Excel
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => exportWorkbook('שיווק_תרופות.csv')}
          >
            CSV
          </button>
        </div>
      </header>

      <section className="toolbar">
        <label className="field search-field">
          <span>חיפוש</span>
          <input
            type="text"
            placeholder="שם תרופה, מרכיב, סיבת הפסקה..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field">
          <span>סיבת הפסקה</span>
          <select value={selectedReason} onChange={(event) => setSelectedReason(event.target.value)}>
            {reasonOptions.map((reason) => (
              <option key={reason} value={reason}>
                {reason === 'all' ? 'הכל' : reason}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>תאריך קבלת הודעה</span>
          <input type="date" value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} />
        </label>

        <label className="field field-empty">
          <span> </span>
          <button type="button" className="clear-button" onClick={() => setNoticeDate('')}>
            נקה סינון
          </button>
        </label>
      </section>

      <section className="stats-grid">
        <div className="stat-card accent">
          <span>רשומות מוצגות</span>
          <strong>{filteredRows.length}</strong>
        </div>
        <div className="stat-card">
          <span>טווח תאריכים</span>
          <strong>09/2026</strong>
        </div>
        <div className="stat-card">
          <span>עדכון</span>
          <strong>06:00</strong>
        </div>
      </section>

      <div className="table-wrap">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={`${row['שם התרופה']}-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.key}-${index}`}>
                    {column.key === 'צפי לחידוש השיווק' ||
                    column.key === 'מועד תחילת הפסקת השימוש' ||
                    column.key === 'קבלת הודעה'
                      ? formatDate(row[column.key])
                      : row[column.key]}
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

export default App
