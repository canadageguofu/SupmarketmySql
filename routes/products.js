const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pool = await getConnection();

    const [products] = await pool.query(`
      SELECT
          p.ProductID,
          p.SKU,
          p.ProductName,
          c.CategoryName,
          s.SupplierName,
          p.CostPrice,
          p.SellingPrice,
          p.ReorderLevel,
          p.Unit,
          p.IsActive
      FROM Products p
      INNER JOIN Categories c ON p.CategoryID = c.CategoryID
      LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
      ORDER BY p.ProductID DESC
    `);

    res.render("products", {
      title: "Products",
      user: req.session.user,
      products
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Products page error");
  }
});

router.post("/add", ensureAuthenticated, async (req, res) => {
  try {
    const {
      SKU,
      Barcode,
      ProductName,
      CategoryID,
      SupplierID,
      CostPrice,
      SellingPrice,
      ReorderLevel,
      Unit,
      IsPerishable
    } = req.body;

    const pool = await getConnection();

    await pool.query(
      `
      INSERT INTO Products
      (SKU, Barcode, ProductName, CategoryID, SupplierID, CostPrice, SellingPrice, ReorderLevel, Unit, IsPerishable, IsActive, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `,
      [
        SKU,
        Barcode || null,
        ProductName,
        parseInt(CategoryID),
        SupplierID ? parseInt(SupplierID) : null,
        parseFloat(CostPrice),
        parseFloat(SellingPrice),
        parseInt(ReorderLevel),
        Unit,
        parseInt(IsPerishable)
      ]
    );

    res.redirect("/products");
  } catch (err) {
    console.error(err);
    res.status(500).send("Add product failed");
  }
});

module.exports = router;