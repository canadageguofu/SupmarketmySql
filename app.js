const express = require("express");
const session = require("express-session");
const path = require("path");
const { engine } = require("express-handlebars");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const inventoryRoutes = require("./routes/inventory");
const reportRoutes = require("./routes/reports");
const advancedReportRoutes = require("./routes/advanced_reports");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supermarket_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60
    }
  })
);

app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
    helpers: {
      eq: (a, b) => a === b
    }
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/products", productRoutes);
app.use("/sales", salesRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/reports", reportRoutes);
app.use("/advanced-reports", advancedReportRoutes);

app.use((req, res) => {
  res.status(404).send("Page not found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});