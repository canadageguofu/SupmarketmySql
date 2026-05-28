const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const today = new Date();
    const priorDate = new Date();
    priorDate.setDate(today.getDate() - 30);
    //   req.query.startDate || new Date().toISOString().split("T")[0];
    // const endDate =
    //   req.query.endDate || new Date().toISOString().split("T")[0];
const endDate =  req.query.endDate || today.toISOString().split("T")[0];
const startDate = req.query.startDate || priorDate.toISOString().split("T")[0];

    // const [reports] = await pool.query(`
    //   SELECT
    //       st.StoreName,
    //       DATE(sh.SaleDate) AS SaleDay,
    //       SUM(sd.LineTotal) AS NetSales,
    //       SUM(sd.Quantity * sd.CostPrice) AS COGS,
    //       SUM(sd.LineTotal) - SUM(sd.Quantity * sd.CostPrice) AS GrossProfit
    //   FROM SalesHeader sh
    //   INNER JOIN SalesDetail sd ON sh.SaleID = sd.SaleID
    //   INNER JOIN Stores st ON sh.StoreID = st.StoreID
    //   WHERE DATE(sh.SaleDate) BETWEEN ? AND ?
    //   GROUP BY st.StoreName, DATE(sh.SaleDate)
    //   ORDER BY SaleDay DESC, st.StoreName
    // `, [startDate, endDate]);

    const [reports] = await pool.query(`
        SELECT
            st.StoreName,
            DATE(sh.SaleDate) AS SaleDay,
            SUM(sd.LineTotal) AS NetSales,
            SUM(sd.Quantity * sd.CostPrice) AS COGS,
            SUM(sd.LineTotal) - SUM(sd.Quantity * sd.CostPrice) AS GrossProfit
        FROM SalesHeader sh
        INNER JOIN SalesDetail sd ON sh.SaleID = sd.SaleID
        INNER JOIN Stores st ON sh.StoreID = st.StoreID
        WHERE sh.SaleDate >= ?
          AND sh.SaleDate < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY st.StoreName, DATE(sh.SaleDate)
        ORDER BY SaleDay DESC, st.StoreName
      `, [startDate, endDate]);



    const [topProducts] = await pool.query(`
      SELECT
          p.ProductID,
          p.ProductName,
          p.SKU,
          SUM(sd.Quantity) AS TotalQtySold,
          SUM(sd.LineTotal) AS TotalSales,
          SUM(sd.Quantity * sd.CostPrice) AS TotalCost,
          SUM(sd.LineTotal) - SUM(sd.Quantity * sd.CostPrice) AS GrossProfit
      FROM SalesDetail sd
      INNER JOIN Products p ON sd.ProductID = p.ProductID
      GROUP BY p.ProductID, p.ProductName, p.SKU
      ORDER BY TotalSales DESC
      LIMIT 10
    `);

    const [bestProfitableProducts] = await pool.query(`
      SELECT
          p.ProductName,
          SUM(sd.LineTotal - (sd.Quantity * sd.CostPrice)) AS GrossProfit
      FROM SalesDetail sd
      INNER JOIN Products p ON sd.ProductID = p.ProductID
      GROUP BY p.ProductName
      ORDER BY GrossProfit DESC
      LIMIT 10
    `);

    const [salesByStore] = await pool.query(`
      SELECT
          s.StoreName,
          SUM(sh.NetAmount) AS TotalSales
      FROM SalesHeader sh
      INNER JOIN Stores s ON sh.StoreID = s.StoreID
      GROUP BY s.StoreName
      ORDER BY TotalSales DESC
    `);

    const [monthlyProfitTrend] = await pool.query(`
      SELECT
          DATE_FORMAT(sh.SaleDate, '%Y-%m') AS SaleMonth,
          SUM(sd.LineTotal - (sd.Quantity * sd.CostPrice)) AS GrossProfit
      FROM SalesHeader sh
      INNER JOIN SalesDetail sd ON sh.SaleID = sd.SaleID
      GROUP BY DATE_FORMAT(sh.SaleDate, '%Y-%m')
      ORDER BY SaleMonth
    `);

    const [inventoryStatus] = await pool.query(`
      SELECT
          CASE
              WHEN i.QuantityOnHand <= p.ReorderLevel THEN 'LOW STOCK'
              ELSE 'OK'
          END AS StockStatus,
          COUNT(*) AS TotalItems
      FROM Inventory i
      INNER JOIN Products p ON i.ProductID = p.ProductID
      GROUP BY CASE
          WHEN i.QuantityOnHand <= p.ReorderLevel THEN 'LOW STOCK'
          ELSE 'OK'
      END
    `);

    const [categoryProfitability] = await pool.query(`
      SELECT
          c.CategoryName,
          SUM(sd.LineTotal - (sd.Quantity * sd.CostPrice)) AS GrossProfit
      FROM SalesDetail sd
      INNER JOIN Products p ON sd.ProductID = p.ProductID
      INNER JOIN Categories c ON p.CategoryID = c.CategoryID
      GROUP BY c.CategoryName
      ORDER BY GrossProfit DESC
    `);

    res.render("reports", {
      title: "Reports",
      user: req.session.user,
      startDate,
      endDate,
      reports,
      topProducts,
      bestProfitableProducts,
      salesByStore,
      monthlyProfitTrend,
      inventoryStatus,
      categoryProfitability,
      topProductsJson: JSON.stringify(topProducts),
      bestProfitableProductsJson: JSON.stringify(bestProfitableProducts),
      salesByStoreJson: JSON.stringify(salesByStore),
      monthlyProfitTrendJson: JSON.stringify(monthlyProfitTrend),
      inventoryStatusJson: JSON.stringify(inventoryStatus),
      categoryProfitabilityJson: JSON.stringify(categoryProfitability)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Reports page error");
  }
});

module.exports = router;