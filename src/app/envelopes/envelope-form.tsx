'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { addQuickAmount, formatBaht } from '@/lib/money'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { createEnvelopeAction } from './actions'

type FormInput = v.InferInput<typeof envelopeInputSchema>

/** ยอดที่เจอบ่อยที่สุดหน้างาน — กดบวกสะสมกันได้ */
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000]

export function EnvelopeForm() {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    setFocus,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    // raw: true — resolver ยังใช้ schema เดิม validate ฝั่ง client แต่ส่งค่าดิบ (string) ไป server
    // เพื่อให้ server v.parse ด้วย schema ตัวเดียวกันได้จริง ไม่ใช่ค่าที่ transform ไปแล้ว
    resolver: valibotResolver(envelopeInputSchema, undefined, { raw: true }),
    defaultValues: { amount: '' },
  })

  const setAmount = (amount: string) => {
    // ล้างช่อง (amount === '') ไม่ต้องเด้ง error ทันที รอตอนกดบันทึก
    setValue('amount', amount, { shouldValidate: amount !== '' })
    setFocus('amount')
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await createEnvelopeAction(values)

    if (result.ok) {
      setServerError(null)
      // วันงานกรอกรัว — ล้างช่องแล้วคืน focus ให้กรอกซองถัดไปได้ทันที
      reset({ amount: '' })
      setFocus('amount')
      return
    }

    Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
      setError(field as keyof FormInput, { message })
    })
    setServerError({ message: result.message, detail: result.detail })
  })

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="ยอด (บาท)" error={errors.amount?.message}>
          {(props) => (
            <input
              className="input"
              inputMode="numeric"
              autoComplete="off"
              // biome-ignore lint/a11y/noAutofocus: ช่องเดียวในหน้า — เปิดมาต้องพิมพ์ได้เลย
              autoFocus
              {...props}
              {...register('amount')}
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant="ghost"
              aria-label={`เพิ่ม ${formatBaht(amount)}`}
              onClick={() => setAmount(addQuickAmount(getValues('amount'), amount))}
            >
              +{amount.toLocaleString('en-US')}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setAmount('')}>
            ล้าง
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            บันทึกซอง
          </Button>
          {serverError ? (
            <span className="field-error" role="alert">
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
