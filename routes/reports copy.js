const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection, sql } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const startDate = req.query.startDate || new Date().toISOString().split("T")[0];
    const endDate = req.query.endDate || new Date().toISOString().split("T")[0];

    const reportResult = await pool
      .request()
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .execute("sp_GetDailyStoreProfitReport");

    const topProductsResult = await pool.request().query(`
      SELECT TOP 10 *
      FROM vw_ProductSalesSummary
      ORDER BY TotalSales DESC
    `);

    res.render("reports", {
      title: "Reports",
      user: req.session.user,
      startDate,
      endDate,
      reports: reportResult.recordset,
      topProducts: topProductsResult.recordset
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Reports page error");
  }
});

module.exports = router;