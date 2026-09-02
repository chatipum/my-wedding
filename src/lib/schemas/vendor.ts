import * as v from 'valibot'
import { idNumber, optionalInteger, optionalText, requiredText } from './shared'

export const vendorInputSchema = v.object({
  name: requiredText('ชื่อผู้ให้บริการ'),
  role: optionalText,
  phone: optionalText,
  line: optionalText,
  totalPrice: optionalInteger,
  note: optionalText,
})

export const vendorUpdateSchema = v.object({ id: idNumber, ...vendorInputSchema.entries })

export type VendorInput = v.InferInput<typeof vendorInputSchema>
export type VendorValues = v.InferOutput<typeof vendorInputSchema>
