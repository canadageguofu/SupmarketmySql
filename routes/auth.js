const express = require("express");
const bcrypt = require("bcryptjs");
const { getConnection } = require("../config/db");

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/login");
});

router.get("/login", (req, res) => {
  res.render("login", { layout: false });
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render("login", {
        layout: false,
        errorMsg: "Username and password are required"
      });
    }

    const pool = await getConnection();

    const [rows] = await pool.query(
      `
      SELECT UserID, Username, PasswordHash, FullName, RoleID, StoreID
      FROM Users
      WHERE Username = ? AND IsActive = 1
      LIMIT 1
      `,
      [username]
    );

    const user = rows[0];

    if (!user) {
      return res.render("login", {
        layout: false,
        errorMsg: "Invalid username"
      });
    }

    let passwordMatch = false;

    if (user.PasswordHash && user.PasswordHash.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    } else {
      passwordMatch = password === user.PasswordHash;
    }

    if (!passwordMatch) {
      return res.render("login", {
        layout: false,
        errorMsg: "Invalid password"
      });
    }

    req.session.user = {
      userId: user.UserID,
      username: user.Username,
      fullName: user.FullName,
      roleId: user.RoleID,
      storeId: user.StoreID
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", {
      layout: false,
      errorMsg: "Login failed"
    });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;