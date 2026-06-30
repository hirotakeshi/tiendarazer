require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth",      require("./routes/login-registro"));
app.use("/api/recuperar", require("./routes/recuperar"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/carrito",   require("./routes/carrito"));
app.use("/api/pedidos",   require("./routes/compra"));
app.use("/api/admin",     require("./routes/admin"));

app.get("/{*path}", (req, res) => {
    if (!req.path.startsWith("/api"))
        res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
