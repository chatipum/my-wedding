'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { vendorInputSchema } from '@/lib/schemas/vendor'
import { createVendorAction } from './actions'

type FormInput = v.InferInput<typeof vendorInputSchema>

const EMPTY: FormInput = { name: '', role: '', phone: '', line: '', totalPrice: '', note: '' }

export function VendorForm() {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: valibotResolver(vendorInputSchema, undefined, { raw: true }),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createVendorAction(values)
    if (result.ok) {
      reset(EMPTY)
      setServerError(null)
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
        <Field label="ชื่อผู้ให้บริการ" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>
        <Field label="หน้าที่" error={errors.role?.message}>
          {(props) => <input className="input" {...props} {...register('role')} />}
        </Field>
        <Field label="เบอร์โทร" error={errors.phone?.message}>
          {(props) => <input className="input" type="tel" {...props} {...register('phone')} />}
        </Field>
        <Field label="LINE" error={errors.line?.message}>
          {(props) => <input className="input" {...props} {...register('line')} />}
        </Field>
        <Field label="ราคาที่ตกลงไว้ (บาท)" error={errors.totalPrice?.message}>
          {(props) => (
            <input className="input" inputMode="numeric" {...props} {...register('totalPrice')} />
          )}
        </Field>
        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มผู้ให้บริการ
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
