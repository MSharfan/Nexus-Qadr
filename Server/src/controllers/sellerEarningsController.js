// Server/src/controllers/sellerEarningsController.js
import pool from "../config/db.js";
import calculateCommission from "../utils/calculateCommission.js";

const COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION || 0);

/* ============================================================
   SELLER TOTAL EARNINGS (GROSS / NET)
============================================================ */
export const getSellerEarnings = async (req, res) => {
  try {
    const seller_id = req.user.id;

    const q = await pool.query(
      `
      SELECT
        COALESCE(SUM(oi.price * oi.quantity), 0) AS gross_earnings
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'returned')
      `,
      [seller_id]
    );

    const gross = Number(q.rows[0].gross_earnings);
    const { platformCommission, sellerEarnings } =
  calculateCommission(gross);


    res.json({
      gross_earnings: gross,
      platform_commission: platformCommission,
      net_earnings: sellerEarnings,
      commission_rate: Number(process.env.PLATFORM_COMMISSION),
    });
  } catch (err) {
    console.error("Get Seller Earnings Error:", err);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
};

/* ============================================================
   DAILY EARNINGS
============================================================ */
export const getDailyEarnings = async (req, res) => {
  try {
    const seller_id = req.user.id;

    const q = await pool.query(
      `
      SELECT
        DATE(o.created_at) AS day,
        SUM(oi.price * oi.quantity) AS gross
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY day
      ORDER BY day DESC
      `,
      [seller_id]
    );

    const data = q.rows.map(row => {
      const gross = Number(row.gross);
      const commission = gross * COMMISSION_RATE;

      return {
        day: row.day,
        gross_earnings: gross,
        platform_commission: commission,
        net_earnings: gross - commission,
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Daily Earnings Error:", err);
    res.status(500).json({ message: "Failed to fetch daily earnings" });
  }
};

/* ============================================================
   MONTHLY EARNINGS
============================================================ */
export const getMonthlyEarnings = async (req, res) => {
  try {
    const seller_id = req.user.id;

    const q = await pool.query(
      `
      SELECT
        TO_CHAR(o.created_at, 'YYYY-MM') AS month,
        SUM(oi.price * oi.quantity) AS gross
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY month
      ORDER BY month DESC
      `,
      [seller_id]
    );

    const data = q.rows.map(row => {
      const gross = Number(row.gross);
      const commission = gross * COMMISSION_RATE;

      return {
        month: row.month,
        gross_earnings: gross,
        platform_commission: commission,
        net_earnings: gross - commission,
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Monthly Earnings Error:", err);
    res.status(500).json({ message: "Failed to fetch monthly earnings" });
  }
};
