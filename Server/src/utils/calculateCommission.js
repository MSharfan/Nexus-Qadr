/**
 * Calculate platform commission and seller earnings
 *
 * @param {number} amount - total order amount for seller
 * @returns {{
 *   platformCommission: number,
 *   sellerEarnings: number
 * }}
 */
const calculateCommission = (amount) => {
  if (typeof amount !== "number" || amount < 0) {
    throw new Error("Invalid amount for commission calculation");
  }

  // Default commission (10%) if not set in env
  const commissionRate = Number(process.env.PLATFORM_COMMISSION) || 0.10;

  const platformCommission = Number(
    (amount * commissionRate).toFixed(2)
  );

  const sellerEarnings = Number(
    (amount - platformCommission).toFixed(2)
  );

  return {
    platformCommission,
    sellerEarnings
  };
};

export default calculateCommission;
