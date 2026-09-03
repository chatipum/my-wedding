'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { Envelope } from '@/db/schema'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { createEnvelopeAction, updateEnvelopeAction } from './actions'

type FormInput = v.InferInput<typeof envelopeInputSchema>

export type EnvelopeFormInitial = FormInput & { id: number }

/** DB row → ค่าในฟอร์ม (ทุกช่องเป็นสตริง เพราะ schema เป็น transform string → number) */
export function toEnvelopeFormValues(row: Envelope): EnvelopeFormInitial {
  return {
    id: row.id,
    giverName: row.giverName ?? '',
    amount: String(row.amount),
    receivedAt: row.receivedAt,
    note: row.note ?? '',
  }
}

export function EnvelopeForm({
  today,
  initial,
  onDone,
}: {
  today: string
  initial?: EnvelopeFormInitial
  onDone?: () => void
}) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    // raw: true — resolver ยังใช้ schema เดิม validate ฝั่ง client แต่ส่งค่าดิบ (string) ไป server
    // เพื่อให้ server v.parse ด้วย schema ตัวเดียวกันได้จริง ไม่ใช่ค่าที่ transform ไปแล้ว
    resolver: valibotResolver(envelopeInputSchema, undefined, { raw: true }),
    defaultValues: initial ?? { giverName: '', amount: '', receivedAt: today, note: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial
      ? await updateEnvelopeAction({ id: initial.id, ...values })
      : await createEnvelopeAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) {
        onDone?.()
        return
      }
      // วันงานกรอกรัว — คงวันที่ไว้ ล้างชื่อกับยอด แล้วคืน focus ไปช่องแรก
      reset({ giverName: '', amount: '', receivedAt: getValues('receivedAt'), note: '' })
      firstFieldRef.current?.focus()
      return
    }

    Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
      setError(field as keyof FormInput, { message })
    })
    setServerError({ message: result.message, detail: result.detail })
  })

  const giverName = register('giverName')

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
        <Field label="ชื่อผู้ให้" hint="ไม่รู้ชื่อก็เว้นว่างได้" error={errors.giverName?.message}>
          {(props) => (
            <input
              className="input"
              {...props}
              {...giverName}
              ref={(element) => {
                giverName.ref(element)
                firstFieldRef.current = element
              }}
            />
          )}
        </Field>

        <Field label="ยอด (บาท)" error={errors.amount?.message}>
          {(props) => (
            <input className="input" inputMode="numeric" {...props} {...register('amount')} />
          )}
        </Field>

        <Field label="วันที่รับ" error={errors.receivedAt?.message}>
          {(props) => (
            <input className="input" type="date" {...props} {...register('receivedAt')} />
          )}
        </Field>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-4 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {initial ? 'บันทึกการแก้ไข' : 'บันทึกซอง'}
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
