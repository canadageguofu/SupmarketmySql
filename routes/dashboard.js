const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const [salesRows] = await pool.query(`
      SELECT IFNULL(SUM(NetAmount), 0) AS TodaySales
      FROM SalesHeader
      WHERE DATE(SaleDate) = CURDATE()
    `);

    const [profitRows] = await pool.query(`
      SELECT IFNULL(SUM(sd.LineTotal - (sd.Quantity * sd.CostPrice)), 0) AS TodayProfit
      FROM SalesHeader sh
      INNER JOIN SalesDetail sd ON sh.SaleID = sd.SaleID
      WHERE DATE(sh.SaleDate) = CURDATE()
    `);

    const [lowStockRows] = await pool.query(`
      SELECT COUNT(*) AS LowStockCount
      FROM Inventory i
      INNER JOIN Products p ON i.ProductID = p.ProductID
      WHERE i.QuantityOnHand <= p.ReorderLevel
    `);

    res.render("dashboard", {
      title: "Dashboard",
      user: req.session.user,
      todaySales: salesRows[0].TodaySales,
      todayProfit: profitRows[0].TodayProfit,
      lowStockCount: lowStockRows[0].LowStockCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
});

module.exports = router;