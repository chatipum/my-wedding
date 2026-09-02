import * as v from 'valibot'
import {
  idNumber,
  optionalBaht,
  optionalDate,
  optionalId,
  optionalText,
  requiredText,
} from './shared'

export const expenseInputSchema = v.object({
  name: requiredText('ชื่อรายการ'),
  category: optionalText,
  amount: optionalBaht,
  isPaid: v.boolean(),
  vendorId: optionalId,
  dueDate: optionalDate,
  note: optionalText,
})

export const expenseUpdateSchema = v.object({ id: idNumber, ...expenseInputSchema.entries })

export const togglePaidSchema = v.object({ id: idNumber, isPaid: v.boolean() })

export type ExpenseInput = v.InferInput<typeof expenseInputSchema>
export type ExpenseValues = v.InferOutput<typeof expenseInputSchema>
