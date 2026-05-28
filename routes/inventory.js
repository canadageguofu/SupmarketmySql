const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const [inventory] = await pool.query(`
      SELECT
          i.InventoryID,
          i.StoreID,
          s.StoreName,
          i.ProductID,
          p.ProductName,
          p.SKU,
          i.QuantityOnHand,
          p.ReorderLevel,
          CASE
              WHEN i.QuantityOnHand <= p.ReorderLevel THEN 'LOW STOCK'
              ELSE 'OK'
          END AS StockStatus
      FROM Inventory i
      INNER JOIN Stores s ON i.StoreID = s.StoreID
      INNER JOIN Products p ON i.ProductID = p.ProductID
      ORDER BY s.StoreName, p.ProductName
    `);

    res.render("inventory", {
      title: "Inventory",
      user: req.session.user,
      inventory
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Inventory page error");
  }
});

router.post("/add", ensureAuthenticated, async (req, res) => {
  const conn = await (await getConnection()).getConnection();

  try {
    const {
      StoreID,
      ProductID,
      UserID,
      MovementType,
      Quantity,
      UnitCost,
      ReferenceNo,
      Notes
    } = req.body;

    const qty = parseFloat(Quantity);
    const unitCost = parseFloat(UnitCost || 0);

    await conn.beginTransaction();

    await conn.query(
      `
      INSERT INTO StockMovements
      (StoreID, ProductID, UserID, MovementType, Quantity, UnitCost, ReferenceNo, Notes, MovementDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        parseInt(StoreID),
        parseInt(ProductID),
        UserID ? parseInt(UserID) : null,
        MovementType,
        qty,
        unitCost,
        ReferenceNo || null,
        Notes || null
      ]
    );

    const [existing] = await conn.query(
      `SELECT InventoryID, QuantityOnHand FROM Inventory WHERE StoreID = ? AND ProductID = ?`,
      [parseInt(StoreID), parseInt(ProductID)]
    );

    let qtyChange = 0;
    if (MovementType === "IN" || MovementType === "ADJUSTMENT") qtyChange = qty;
    if (MovementType === "OUT" || MovementType === "DAMAGE") qtyChange = -qty;

    if (existing.length > 0) {
      await conn.query(
        `
        UPDATE Inventory
        SET QuantityOnHand = QuantityOnHand + ?,
            LastUpdated = NOW()
        WHERE StoreID = ? AND ProductID = ?
        `,
        [qtyChange, parseInt(StoreID), parseInt(ProductID)]
      );
    } else {
      await conn.query(
        `
        INSERT INTO Inventory (StoreID, ProductID, QuantityOnHand, LastUpdated)
        VALUES (?, ?, ?, NOW())
        `,
        [parseInt(StoreID), parseInt(ProductID), qtyChange]
      );
    }

    await conn.commit();
    res.redirect("/inventory");
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send("Inventory movement failed");
  } finally {
    conn.release();
  }
});

module.exports = router;