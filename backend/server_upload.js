const http = require("http");
const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const app = express();

// Konfigurasi session (sederhana)
const sessionMiddleware = session({
  secret: "your-secret-key-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 jam
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 61994;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(sessionMiddleware);
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173", // untuk development Vite (ubah sesuai kebutuhan)
    credentials: true,
  })
);

// Route API (jika ada)
// Pastikan file ./routes/route.js ada, jika tidak, komentari bagian ini
try {
  const routes = require("./routes/route.js");
  app.use("/api", routes); // prefix /api untuk membedakan dengan frontend
} catch (err) {
  console.log("Route file not found, skipping API routes...");
}

// Serve static files dari folder DIST (hasil build frontend)
// Folder dist sejajar dengan server_upload.js
app.use(express.static(path.join(__dirname, "dist")));

// Catch-all route untuk SPA (semua request diarahkan ke index.html)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(61994, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${path.join(__dirname, "public")}`);
});
