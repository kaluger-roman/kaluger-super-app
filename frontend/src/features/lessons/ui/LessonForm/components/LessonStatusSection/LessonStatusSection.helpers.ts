import { toReceivedAmountInput } from "../../../../models";
import type { LessonFormData } from "../../LessonForm.types";

// A positive price typed in the form is the default "Получено" in the payment
// dialog; otherwise the switch keeps following the saved price, as before.
export const getPaymentDialogPrice = (
  formPrice: string,
  lessonPrice: number | undefined
): number | undefined => {
  const price = Number(formPrice);
  return formPrice.trim() && Number.isFinite(price) && price > 0 ? price : lessonPrice;
};

export const applyPaymentChange = (
  formData: LessonFormData,
  isPaid: boolean,
  paymentDate?: string,
  receivedAmount?: number
): LessonFormData => ({
  ...formData,
  isPaid,
  paymentDate,
  receivedAmount: isPaid ? toReceivedAmountInput(receivedAmount) : "",
});
