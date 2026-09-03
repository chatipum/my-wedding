'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { ChecklistWithVendor, VendorOption } from '@/db/queries'
import { checklistInputSchema } from '@/lib/schemas/checklist'
import { createChecklistItemAction, updateChecklistItemAction } from './actions'

type FormInput = v.InferInput<typeof checklistInputSchema>

const EMPTY: FormInput = {
  name: '',
  category: '',
  status: 'not_started',
  budget: '',
  deadline: '',
  depositPaid: false,
  vendorId: '',
  note: '',
}

export type ChecklistFormInitial = FormInput & { id: number }

export function toChecklistFormValues(row: ChecklistWithVendor): ChecklistFormInitial {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    status: row.status,
    budget: row.budget === null ? '' : String(row.budget),
    deadline: row.deadline ?? '',
    depositPaid: row.depositPaid,
    vendorId: row.vendorId === null ? '' : String(row.vendorId),
    note: row.note ?? '',
  }
}

export function ChecklistForm({
  vendorOptions,
  initial,
  onDone,
}: {
  vendorOptions: VendorOption[]
  initial?: ChecklistFormInitial
  onDone?: () => void
}) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: valibotResolver(checklistInputSchema, undefined, { raw: true }),
    defaultValues: initial ?? EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial
      ? await updateChecklistItemAction({ id: initial.id, ...values })
      : await createChecklistItemAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) onDone?.()
      else reset(EMPTY)
      return
    }

    Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
      setError(field as keyof FormInput, { message })
    })
    setServerError({ message: result.message, detail: result.detail })
  })

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่องาน" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>

        <Field label="หมวด" error={errors.category?.message}>
          {(props) => <input className="input" {...props} {...register('category')} />}
        </Field>

        <Field label="สถานะ" error={errors.status?.message}>
          {(props) => (
            <select className="input" {...props} {...register('status')}>
              <option value="not_started">ยังไม่เริ่ม</option>
              <option value="in_progress">กำลังทำ</option>
              <option value="done">เสร็จแล้ว</option>
            </select>
          )}
        </Field>

        <Field label="งบที่ตั้งไว้ (บาท)" hint="ไม่ถูกนำไปบวกกับยอดค่าใช้จ่าย" error={errors.budget?.message}>
          {(props) => (
            <input className="input" inputMode="numeric" {...props} {...register('budget')} />
          )}
        </Field>

        <Field label="กำหนดส่ง" error={errors.deadline?.message}>
          {(props) => <input className="input" type="date" {...props} {...register('deadline')} />}
        </Field>

        <Field label="ผู้ให้บริการ" error={errors.vendorId?.message}>
          {(props) => (
            <select className="input" {...props} {...register('vendorId')}>
              <option value="">ยังไม่ระบุ</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('depositPaid')} />
          จ่ายมัดจำแล้ว
        </label>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {initial ? 'บันทึกการแก้ไข' : 'เพิ่มงาน'}
          </Button>
          {initial ? (
            <Button variant="ghost" onClick={() => onDone?.()}>
              ยกเลิก
            </Button>
          ) : null}
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
