import pool from "../config/db.js";

/* ============================================================
   SELLER PAYOUT SUMMARY
============================================================ */
export const getPayoutSummary = async (req, res) => {
  try {
    const seller_id = req.user.id;
    const COMMISSION = Number(process.env.PLATFORM_COMMISSION || 0);

    // Total paid earnings
    const earningsQ = await pool.query(
      `
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) AS gross
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.seller_id = $1
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'returned')
      `,
      [seller_id]
    );

    const gross = Number(earningsQ.rows[0].gross);
    const net = gross - gross * COMMISSION;

    // Total paid out
    const paidQ = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS paid
      FROM seller_payouts
      WHERE seller_id = $1
      `,
      [seller_id]
    );

    const paid = Number(paidQ.rows[0].paid);
    const payable = net - paid;

    res.json({
      net_earnings: net,
      total_paid_out: paid,
      payable_balance: payable,
    });
  } catch (err) {
    console.error("Payout Summary Error:", err);
    res.status(500).json({ message: "Failed to fetch payout summary" });
  }
};

/* ============================================================
   SELLER REQUEST PAYOUT
============================================================ */
export const requestPayout = async (req, res) => {
  try {
    const seller_id = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Get payable balance
    const summaryQ = await pool.query(
      `
      SELECT
        (
          SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN orders o ON o.id = oi.order_id
          WHERE p.seller_id = $1
            AND o.payment_status = 'paid'
            AND o.status NOT IN ('cancelled', 'returned')
        )
        -
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM seller_payouts
          WHERE seller_id = $1
        ) AS payable
      `,
      [seller_id]
    );

    const payable = Number(summaryQ.rows[0].payable);

    if (amount > payable) {
      return res.status(400).json({
        message: "Requested amount exceeds payable balance",
      });
    }

    await pool.query(
      `
      INSERT INTO seller_payout_requests (seller_id, amount)
      VALUES ($1, $2)
      `,
      [seller_id, amount]
    );

    res.json({ message: "Payout request submitted" });
  } catch (err) {
    console.error("Request Payout Error:", err);
    res.status(500).json({ message: "Failed to request payout" });
  }
};
