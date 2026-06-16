import pool from "../config/db.js";

/* ============================================================
   GET ALL PAYOUT REQUESTS
============================================================ */
export const getPayoutRequests = async (req, res) => {
  try {
    const q = await pool.query(
      `
      SELECT pr.*, u.name, u.email
      FROM seller_payout_requests pr
      JOIN users u ON u.id = pr.seller_id
      ORDER BY pr.requested_at DESC
      `
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Payout Requests Error:", err);
    res.status(500).json({ message: "Failed to fetch payout requests" });
  }
};

/* ============================================================
   APPROVE / REJECT PAYOUT REQUEST
============================================================ */
export const updatePayoutRequestStatus = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const r = await pool.query(
      `
      UPDATE seller_payout_requests
      SET status = $1, processed_at = NOW()
      WHERE id = $2 AND status = 'pending'
      RETURNING *
      `,
      [status, request_id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Request not found or already processed" });
    }

    res.json({
      message: `Payout request ${status}`,
      request: r.rows[0],
    });
  } catch (err) {
    console.error("Update Payout Request Error:", err);
    res.status(500).json({ message: "Failed to update payout request" });
  }
};

/* ============================================================
   MARK PAYOUT AS PAID (FINAL STEP)
============================================================ */
export const processPayout = async (req, res) => {
  const client = await pool.connect();

  try {
    const { request_id } = req.params;
    const { reference_id, payout_method } = req.body;

    if (!reference_id) {
      return res.status(400).json({ message: "Reference ID required" });
    }

    await client.query("BEGIN");

    const reqQ = await client.query(
      `
      SELECT * FROM seller_payout_requests
      WHERE id = $1 AND status = 'approved'
      FOR UPDATE
      `,
      [request_id]
    );

    if (reqQ.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Approved payout request not found" });
    }

    const request = reqQ.rows[0];

    // Insert payout ledger entry
    await client.query(
      `
      INSERT INTO seller_payouts (seller_id, amount, payout_method, reference_id)
      VALUES ($1, $2, $3, $4)
      `,
      [request.seller_id, request.amount, payout_method || "manual", reference_id]
    );

    // Mark request as paid
    await client.query(
      `
      UPDATE seller_payout_requests
      SET status = 'paid', processed_at = NOW()
      WHERE id = $1
      `,
      [request_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Payout processed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Process Payout Error:", err);
    res.status(500).json({ message: "Failed to process payout" });
  } finally {
    client.release();
  }
};
