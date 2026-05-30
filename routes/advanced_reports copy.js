const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const [salesPerSquareFoot] = await pool.query(`
      SELECT * FROM vw_SalesPerSquareFoot ORDER BY SalesPerSquareFoot DESC
    `);

    const [gmroi] = await pool.query(`
      SELECT * FROM vw_GMROI ORDER BY GMROI DESC LIMIT 10
    `);

    const [inventoryTurnover] = await pool.query(`
      SELECT * FROM vw_InventoryTurnover ORDER BY InventoryTurnoverRate DESC LIMIT 10
    `);

    const [atv] = await pool.query(`
      SELECT * FROM vw_ATV ORDER BY SaleDay DESC LIMIT 30
    `);

    const [basketSize] = await pool.query(`
      SELECT * FROM vw_BasketSize ORDER BY SaleDay DESC LIMIT 30
    `);

    const [conversionRate] = await pool.query(`
      SELECT * FROM vw_ConversionRate ORDER BY TrafficDate DESC, StoreName
    `);

    const [customerRetention] = await pool.query(`
      SELECT * FROM vw_CustomerRetention
    `);

    const [shrinkageRate] = await pool.query(`
      SELECT * FROM vw_ShrinkageRate ORDER BY ShrinkageRate DESC
    `);

    const [marketBasket] = await pool.query(`
      SELECT * FROM vw_MarketBasket ORDER BY TimesBoughtTogether DESC LIMIT 20
    `);

    const [spaceProfitability] = await pool.query(`
      SELECT * FROM vw_SpaceProfitability ORDER BY SpaceProfitability DESC LIMIT 20
    `);

    const [faceProfit] = await pool.query(`
      SELECT * FROM vw_FaceProfit ORDER BY FaceProfit DESC LIMIT 20
    `);

    const [stockProfitability] = await pool.query(`
      SELECT * FROM vw_StockProfitability ORDER BY StockProfitability DESC LIMIT 20
    `);

    const [shelfSpaceReturns] = await pool.query(`
      SELECT * FROM vw_ShelfSpaceReturns ORDER BY ShelfSpaceReturns DESC LIMIT 20
    `);

    res.render("advanced_reports", {
      title: "Advanced Retail Analytics",
      user: req.session.user,

      salesPerSquareFoot,
      gmroi,
      inventoryTurnover,
      atv,
      basketSize,
      conversionRate,
      customerRetention,
      shrinkageRate,
      marketBasket,
      spaceProfitability,
      faceProfit,
      stockProfitability,
      shelfSpaceReturns,

      salesPerSquareFootJson: JSON.stringify(salesPerSquareFoot),
      gmroiJson: JSON.stringify(gmroi),
      inventoryTurnoverJson: JSON.stringify(inventoryTurnover),
      atvJson: JSON.stringify(atv),
      basketSizeJson: JSON.stringify(basketSize),
      conversionRateJson: JSON.stringify(conversionRate),
      shrinkageRateJson: JSON.stringify(shrinkageRate),
      marketBasketJson: JSON.stringify(marketBasket),
      spaceProfitabilityJson: JSON.stringify(spaceProfitability),
      faceProfitJson: JSON.stringify(faceProfit),
      stockProfitabilityJson: JSON.stringify(stockProfitability),
      shelfSpaceReturnsJson: JSON.stringify(shelfSpaceReturns)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Advanced reports page error");
  }
});

module.exports = router;