const express = require("express");
const router  = express.Router();
const db      = require("../db");
 
const BASE_SQL = "SELECT p.*, c.nombre_categoria AS categoria FROM productos p JOIN categorias c ON p.id_categoria = c.id_categoria";
 
// GET /api/productos — todos los productos
router.get("/", (req, res) => {
    db.query(BASE_SQL, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
 
// GET /api/productos/destacados
router.get("/destacados", (req, res) => {
    const sql = `${BASE_SQL} WHERE p.id_producto IN (19, 10, 3) ORDER BY FIELD(p.id_producto, 19, 10, 3)`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
 
// GET /api/productos/categoria/:nombre
router.get("/categoria/:nombre", (req, res) => {
    const sql = `${BASE_SQL} WHERE c.nombre_categoria = ? ORDER BY p.id_producto ASC`;
    db.query(sql, [req.params.nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
 
// GET /api/productos/:id — un solo producto
router.get("/:id", (req, res) => {
    const sql = `${BASE_SQL} WHERE p.id_producto = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(results[0]);
    });
});
 
module.exports = router;