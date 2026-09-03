'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { Vendor } from '@/db/schema'
import { vendorInputSchema } from '@/lib/schemas/vendor'
import { createVendorAction, updateVendorAction } from './actions'

type FormInput = v.InferInput<typeof vendorInputSchema>

const EMPTY: FormInput = { name: '', role: '', phone: '', line: '', totalPrice: '', note: '' }

export type VendorFormInitial = FormInput & { id: number }

export function toVendorFormValues(vendor: Vendor): VendorFormInitial {
  return {
    id: vendor.id,
    name: vendor.name,
    role: vendor.role ?? '',
    phone: vendor.phone ?? '',
    line: vendor.line ?? '',
    totalPrice: vendor.totalPrice === null ? '' : String(vendor.totalPrice),
    note: vendor.note ?? '',
  }
}

export function VendorForm({
  initial,
  onDone,
}: {
  initial?: VendorFormInitial
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
    resolver: valibotResolver(vendorInputSchema, undefined, { raw: true }),
    defaultValues: initial ?? EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial
      ? await updateVendorAction({ id: initial.id, ...values })
      : await createVendorAction(values)

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
            {initial ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ให้บริการ'}
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
