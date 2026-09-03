'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { guestInputSchema } from '@/lib/schemas/guest'
import { createGuestAction } from './actions'

type FormInput = v.InferInput<typeof guestInputSchema>

const BLANK: FormInput = {
  name: '',
  side: 'groom',
  group: '',
  companionsEstimated: '0',
  companionsConfirmed: '',
  rsvp: 'pending',
  note: '',
}

export function GuestForm() {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: valibotResolver(guestInputSchema, undefined, { raw: true }),
    defaultValues: BLANK,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createGuestAction(values)
    if (result.ok) {
      // กรอกทีละ ~10 คนติดกัน — ฝั่งกับกลุ่มมักซ้ำเดิม จึงจำค่าล่าสุดไว้
      reset({ ...BLANK, side: getValues('side'), group: getValues('group') })
      nameRef.current?.focus()
      setServerError(null)
      return
    }
    Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
      setError(field as keyof FormInput, { message })
    })
    setServerError({ message: result.message, detail: result.detail })
  })

  const name = register('name')

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่อแขก" error={errors.name?.message}>
          {(props) => (
            <input
              className="input"
              {...props}
              {...name}
              ref={(element) => {
                name.ref(element)
                nameRef.current = element
              }}
            />
          )}
        </Field>

        <Field label="ฝ่าย" error={errors.side?.message}>
          {(props) => (
            <select className="input" {...props} {...register('side')}>
              <option value="groom">เจ้าบ่าว</option>
              <option value="bride">เจ้าสาว</option>
            </select>
          )}
        </Field>

        <Field label="กลุ่ม" hint="ญาติ / เพื่อน / ที่ทำงาน" error={errors.group?.message}>
          {(props) => <input className="input" {...props} {...register('group')} />}
        </Field>

        <Field label="ผู้ติดตามที่คาดว่าจะมา" error={errors.companionsEstimated?.message}>
          {(props) => (
            <input
              className="input"
              inputMode="numeric"
              {...props}
              {...register('companionsEstimated')}
            />
          )}
        </Field>

        <Field
          label="ผู้ติดตามที่ยืนยันแล้ว"
          hint="เว้นว่าง = ยังไม่ได้ถาม · 0 = ถามแล้วมาคนเดียว"
          error={errors.companionsConfirmed?.message}
        >
          {(props) => (
            <input
              className="input"
              inputMode="numeric"
              {...props}
              {...register('companionsConfirmed')}
            />
          )}
        </Field>

        <Field label="ตอบรับ" error={errors.rsvp?.message}>
          {(props) => (
            <select className="input" {...props} {...register('rsvp')}>
              <option value="pending">ยังไม่ตอบ</option>
              <option value="yes">มาแน่</option>
              <option value="no">ไม่มา</option>
            </select>
          )}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มแขก
          </Button>
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
