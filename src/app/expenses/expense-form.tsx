'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { ExpenseWithVendor, VendorOption } from '@/db/queries'
import { expenseInputSchema } from '@/lib/schemas/expense'
import { createExpenseAction, updateExpenseAction } from './actions'

type FormInput = v.InferInput<typeof expenseInputSchema>

const EMPTY: FormInput = {
  name: '',
  category: '',
  amount: '',
  isPaid: false,
  vendorId: '',
  dueDate: '',
  note: '',
}

export type ExpenseFormInitial = FormInput & { id: number }

/** DB row → ค่าในฟอร์ม (ทุกช่องเป็นสตริง เพราะ schema เป็น transform string → number) */
export function toExpenseFormValues(row: ExpenseWithVendor): ExpenseFormInitial {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    amount: row.amount === null ? '' : String(row.amount),
    isPaid: row.isPaid,
    vendorId: row.vendorId === null ? '' : String(row.vendorId),
    dueDate: row.dueDate ?? '',
    note: row.note ?? '',
  }
}

export function ExpenseForm({
  vendorOptions,
  initial,
  onDone,
}: {
  vendorOptions: VendorOption[]
  initial?: ExpenseFormInitial
  onDone?: () => void
}) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  // raw: true — resolver ยังใช้ schema เดิม validate ฝั่ง client แต่ส่งค่าดิบ (string) ไป server
  // เพื่อให้ server v.parse ด้วย schema ตัวเดียวกันได้จริง ไม่ใช่ค่าที่ transform ไปแล้ว
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: valibotResolver(expenseInputSchema, undefined, { raw: true }),
    defaultValues: initial ?? EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial
      ? await updateExpenseAction({ id: initial.id, ...values })
      : await createExpenseAction(values)

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
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อรายการ" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>

        <Field label="หมวด" error={errors.category?.message}>
          {(props) => <input className="input" {...props} {...register('category')} />}
        </Field>

        <Field label="ยอดเงิน (บาท)" hint="เว้นว่างได้ถ้ายังไม่รู้ยอด" error={errors.amount?.message}>
          {(props) => (
            <input className="input" inputMode="numeric" {...props} {...register('amount')} />
          )}
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

        <Field label="กำหนดจ่าย" hint="ปปปป-ดด-วว" error={errors.dueDate?.message}>
          {(props) => <input className="input" type="date" {...props} {...register('dueDate')} />}
        </Field>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('isPaid')} />
          จ่ายแล้ว
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {initial ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
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
