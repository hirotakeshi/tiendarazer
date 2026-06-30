const express = require("express");
const router  = express.Router();
const db      = require("../db");

router.post("/add", (req, res) => {
    const { id_carrito, id_producto, cantidad = 1 } = req.body;
    if (!id_carrito || !id_producto) return res.status(400).json({ error: "Datos incompletos" });
    if (cantidad <= 0) return res.status(400).json({ error: "Cantidad inválida" });

    db.query("SELECT precio FROM productos WHERE id_producto = ?", [id_producto], (err, rows) => {
        if (err)  return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: "Producto no existe" });

        const precio = rows[0].precio;
        db.query(
            "SELECT id_carrito_producto FROM carrito_productos WHERE id_carrito = ? AND id_producto = ?",
            [id_carrito, id_producto],
            (err2, existentes) => {
                if (err2) return res.status(500).json({ error: err2.message });

                if (existentes.length) {
                    db.query(
                        "UPDATE carrito_productos SET cantidad = cantidad + ? WHERE id_carrito = ? AND id_producto = ?",
                        [cantidad, id_carrito, id_producto],
                        (err3) => err3 ? res.status(500).json({ error: err3.message }) : res.json({ mensaje: "Cantidad actualizada 🔁" })
                    );
                } else {
                    db.query(
                        "INSERT INTO carrito_productos (id_carrito, id_producto, cantidad, precio) VALUES (?, ?, ?, ?)",
                        [id_carrito, id_producto, cantidad, precio],
                        (err4) => err4 ? res.status(500).json({ error: err4.message }) : res.json({ mensaje: "Producto agregado 🛒" })
                    );
                }
            }
        );
    });
});

router.get("/:id_carrito", (req, res) => {
    db.query(`
        SELECT cp.id_carrito_producto AS id, cp.cantidad, cp.precio,
               p.nombre_producto, p.imagen,
               (cp.cantidad * cp.precio) AS subtotal
        FROM carrito_productos cp
        JOIN productos p ON cp.id_producto = p.id_producto
        WHERE cp.id_carrito = ?
    `, [req.params.id_carrito], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.delete("/item/:id", (req, res) => {
    db.query("DELETE FROM carrito_productos WHERE id_carrito_producto = ?", [req.params.id],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ mensaje: "Ítem eliminado ❌" }));
});

router.delete("/vaciar/:id_carrito", (req, res) => {
    db.query("DELETE FROM carrito_productos WHERE id_carrito = ?", [req.params.id_carrito],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ mensaje: "Carrito vaciado 🧹" }));
});

module.exports = router;
