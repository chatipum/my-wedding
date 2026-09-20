'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Side } from '@/db/schema'
import { type ImportRow, toImportRows } from '@/lib/guest-import'
import { importGuestsAction } from './actions'

/** id ติดมาตั้งแต่ตอนอ่านไฟล์ — รายการไม่เคยสลับหรือถูกตัดออก ติ๊กอย่างเดียว จึงใช้เป็น key ได้ */
type Selectable = ImportRow & { id: number; selected: boolean }

export function ImportGuests({ existingNames }: { existingNames: string[] }) {
  const [rows, setRows] = useState<Selectable[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [side, setSide] = useState<Side>('groom')
  const [group, setGroup] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const chosen = rows?.filter((row) => row.selected) ?? []
  const duplicateCount = rows?.filter((row) => row.duplicate).length ?? 0

  async function onPickFile(file: File | undefined) {
    setError(null)
    setRows(null)
    setFileName(file?.name ?? '')
    if (!file) return

    try {
      // อ่านฝั่งเบราว์เซอร์ ไฟล์จึงไม่ต้องวิ่งขึ้น server และ preview ขึ้นทันที
      const { readSheet } = await import('read-excel-file/browser')
      const sheet = await readSheet(file)
      // ชื่อซ้ำติ๊กออกไว้ก่อน แต่ยังอยู่ในรายการให้ติ๊กกลับเองได้
      setRows(
        toImportRows(sheet, existingNames).map((row, index) => ({
          ...row,
          id: index,
          selected: !row.duplicate,
        })),
      )
    } catch (cause) {
      setError(`อ่านไฟล์ไม่ได้: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }

  function toggle(id: number) {
    setRows(
      (current) =>
        current?.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)) ?? null,
    )
  }

  function setAll(selected: boolean) {
    setRows((current) => current?.map((row) => ({ ...row, selected })) ?? null)
  }

  function save() {
    startSaving(async () => {
      const result = await importGuestsAction({
        names: chosen.map((row) => row.name),
        side,
        group,
      })

      if (!result.ok) {
        setError(result.detail ? `${result.message} (${result.detail})` : result.message)
        return
      }

      setError(null)
      setRows(null)
      setFileName('')
    })
  }

  return (
    <Card className="mb-6">
      <details>
        <summary className="cursor-pointer">นำเข้าจาก Excel</summary>

        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted text-sm">
            ไฟล์ .xlsx คอลัมน์แรกเป็นชื่อแขก แถวแรกเป็นหัวตาราง · แขกที่นำเข้าจะลงเป็น “มาแน่” และผู้ติดตาม 0
          </p>

          <input
            className="input"
            type="file"
            accept=".xlsx"
            aria-label="เลือกไฟล์ Excel"
            onChange={(event) => onPickFile(event.target.files?.[0])}
          />

          {rows ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="import-side">ฝ่าย</label>
                  <select
                    id="import-side"
                    className="input"
                    value={side}
                    onChange={(event) => setSide(event.target.value as Side)}
                  >
                    <option value="groom">เจ้าบ่าว</option>
                    <option value="bride">เจ้าสาว</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="import-group">กลุ่ม</label>
                  <input
                    id="import-group"
                    className="input"
                    value={group}
                    onChange={(event) => setGroup(event.target.value)}
                  />
                </div>
              </div>

              <p className="text-muted">
                {fileName} · อ่านได้ {rows.length} ชื่อ · เลือกไว้ {chosen.length}
                {duplicateCount > 0 ? ` · ซ้ำกับรายชื่อเดิม ${duplicateCount}` : ''}
              </p>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setAll(true)}>
                  เลือกทั้งหมด
                </Button>
                <Button variant="ghost" onClick={() => setAll(false)}>
                  ไม่เลือกเลย
                </Button>
              </div>

              <ul className="max-h-80 overflow-y-auto flex flex-col gap-1">
                {rows.map((row) => (
                  <li key={row.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggle(row.id)}
                      />
                      <span>{row.name}</span>
                      {row.duplicate ? <span className="text-muted text-sm">· ชื่อซ้ำ</span> : null}
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={isSaving || chosen.length === 0}>
                  เพิ่ม {chosen.length} คน
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRows(null)
                    setFileName('')
                    setError(null)
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </details>
    </Card>
  )
}
