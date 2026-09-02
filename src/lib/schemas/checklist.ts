import * as v from 'valibot'
import {
  idNumber,
  optionalBaht,
  optionalDate,
  optionalId,
  optionalText,
  requiredText,
} from './shared'

export const checklistStatusSchema = v.picklist(
  ['not_started', 'in_progress', 'done'],
  'สถานะไม่ถูกต้อง',
)

export const checklistInputSchema = v.object({
  name: requiredText('ชื่องาน'),
  category: optionalText,
  status: checklistStatusSchema,
  budget: optionalBaht,
  deadline: optionalDate,
  depositPaid: v.boolean(),
  vendorId: optionalId,
  note: optionalText,
})

export const checklistUpdateSchema = v.object({ id: idNumber, ...checklistInputSchema.entries })

export const toggleChecklistStatusSchema = v.object({ id: idNumber, status: checklistStatusSchema })

export type ChecklistInput = v.InferInput<typeof checklistInputSchema>
export type ChecklistValues = v.InferOutput<typeof checklistInputSchema>
