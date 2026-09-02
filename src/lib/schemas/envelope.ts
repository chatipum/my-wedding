import * as v from 'valibot'
import { idNumber, optionalText, requiredDate, requiredInteger } from './shared'

export const envelopeInputSchema = v.object({
  giverName: optionalText,
  amount: requiredInteger('ยอดเงิน'),
  receivedAt: requiredDate,
  note: optionalText,
})

export const envelopeUpdateSchema = v.object({ id: idNumber, ...envelopeInputSchema.entries })

export type EnvelopeInput = v.InferInput<typeof envelopeInputSchema>
export type EnvelopeValues = v.InferOutput<typeof envelopeInputSchema>
