const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();
    const [sales] = await pool.query(`
      SELECT SaleID, StoreID, SaleDate, NetAmount, PaymentMethod
      FROM SalesHeader
      ORDER BY SaleID DESC
      LIMIT 20
    `);

    res.render("sales", {
      title: "Sales",
      user: req.session.user,
      sales
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Sales page error");
  }
});

router.post("/add", ensureAuthenticated, async (req, res) => {
  const conn = await (await getConnection()).getConnection();

  try {
    const {
      StoreID,
      UserID,
      PaymentMethod,
      TaxAmount,
      ProductID,
      Quantity,
      UnitPrice,
      CostPrice,
      DiscountAmount
    } = req.body;

    const qty = parseFloat(Quantity);
    const unitPrice = parseFloat(UnitPrice);
    const costPrice = parseFloat(CostPrice);
    const discount = parseFloat(DiscountAmount || 0);
    const tax = parseFloat(TaxAmount || 0);

    const grossAmount = qty * unitPrice;
    const netAmount = grossAmount - discount + tax;
    const lineTotal = grossAmount - discount;

    await conn.beginTransaction();

    const [headerResult] = await conn.query(
      `
      INSERT INTO SalesHeader
      (StoreID, UserID, SaleDate, GrossAmount, DiscountAmount, TaxAmount, NetAmount, PaymentMethod)
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)
      `,
      [
        parseInt(StoreID),
        parseInt(UserID),
        grossAmount,
        discount,
        tax,
        netAmount,
        PaymentMethod
      ]
    );

    const saleID = headerResult.insertId;

    await conn.query(
      `
      INSERT INTO SalesDetail
      (SaleID, ProductID, Quantity, UnitPrice, CostPrice, DiscountAmount, LineTotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        saleID,
        parseInt(ProductID),
        qty,
        unitPrice,
        costPrice,
        discount,
        lineTotal
      ]
    );

    await conn.query(
      `
      UPDATE Inventory
      SET QuantityOnHand = QuantityOnHand - ?,
          LastUpdated = NOW()
      WHERE StoreID = ? AND ProductID = ?
      `,
      [qty, parseInt(StoreID), parseInt(ProductID)]
    );

    await conn.commit();
    res.redirect("/sales");
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send("Add sale failed");
  } finally {
    conn.release();
  }
});

module.exports = router;