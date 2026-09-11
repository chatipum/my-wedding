import * as v from 'valibot'
import { requiredInteger } from './shared'

export const envelopeInputSchema = v.object({
  amount: requiredInteger('ยอดซอง'),
})

export type EnvelopeInput = v.InferInput<typeof envelopeInputSchema>
export type EnvelopeValues = v.InferOutput<typeof envelopeInputSchema>
