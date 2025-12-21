export const calculateBalance = (
  amountOwed: number = 0,
  amountPaid: number = 0
): number => {
  return Math.max(amountOwed - amountPaid, 0);
};
