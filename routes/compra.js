const express = require("express");
const router  = express.Router();
const db      = require("../db");

const ENVIO_GRATIS_MINIMO = 150000;
const COSTO_ENVIO         = 20000;

function calcularDescuento(carrito) {
    const totalBruto    = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
    const cantItems     = carrito.reduce((a, i) => a + i.cantidad, 0);
    const pct           = cantItems >= 3 ? 10 : 0;
    const descuento     = +(totalBruto * pct / 100).toFixed(2);
    const subtotalFinal = +(totalBruto - descuento).toFixed(2);
    const envio         = subtotalFinal >= ENVIO_GRATIS_MINIMO ? 0 : COSTO_ENVIO;
    const totalFinal    = +(subtotalFinal + envio).toFixed(2);
    return { totalBruto, pct, descuento, subtotalFinal, envio, totalFinal };
}

router.post("/preview-descuento", (req, res) => {
    const { carrito } = req.body;
    if (!carrito?.length) return res.json({ pct: 0, descuento: 0, totalFinal: 0, totalBruto: 0 });
    res.json(calcularDescuento(carrito));
});

router.post("/checkout", (req, res) => {
    const { id_usuario, id_metodo, carrito } = req.body;
    if (!id_usuario || !id_metodo) return res.status(400).json({ error: "Datos incompletos" });
    if (!carrito?.length) return res.status(400).json({ error: "Carrito vacío" });
    if (carrito.some(i => !i.id_producto || i.cantidad <= 0))
        return res.status(400).json({ error: "Ítem con datos inválidos" });

    const { totalBruto, pct, descuento, totalFinal } = calcularDescuento(carrito);

    db.getConnection((errConn, conn) => {
        if (errConn) return res.status(500).json({ error: errConn.message });

        conn.beginTransaction(errTx => {
            if (errTx) { conn.release(); return res.status(500).json({ error: errTx.message }); }

            const checkStock = carrito.map(item => new Promise((resolve, reject) => {
                conn.query(
                    "SELECT stock, nombre_producto FROM productos WHERE id_producto = ? FOR UPDATE",
                    [item.id_producto],
                    (err, rows) => {
                        if (err) return reject(err);
                        if (!rows.length) return reject(new Error(`Producto ID ${item.id_producto} no existe`));
                        if (rows[0].stock < item.cantidad) return reject(new Error(`Sin stock: ${rows[0].nombre_producto}`));
                        resolve();
                    }
                );
            }));

            Promise.all(checkStock).then(() => {
                conn.query(
                    "INSERT INTO pedidos (id_usuario, id_metodo, total, descuento_pct, descuento_monto, estado) VALUES (?, ?, ?, ?, ?, 'pendiente')",
                    [id_usuario, id_metodo, totalFinal, pct, descuento],
                    (errPed, resPed) => {
                        if (errPed) return rollback(conn, res, errPed);
                        const id_pedido = resPed.insertId;

                        const ops = carrito.flatMap(item => [
                            new Promise((resolve, reject) => {
                                conn.query(
                                    "INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio) VALUES (?, ?, ?, ?)",
                                    [id_pedido, item.id_producto, item.cantidad, item.precio],
                                    err => err ? reject(err) : resolve()
                                );
                            }),
                            new Promise((resolve, reject) => {
                                conn.query(
                                    "UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?",
                                    [item.cantidad, item.id_producto, item.cantidad],
                                    (err, result) => {
                                        if (err) return reject(err);
                                        if (!result.affectedRows) return reject(new Error("Stock insuficiente al actualizar"));
                                        resolve();
                                    }
                                );
                            })
                        ]);

                        ops.push(new Promise((resolve, reject) => {
                            conn.query(
                                "UPDATE pedidos SET estado = 'completado' WHERE id_pedido = ?",
                                [id_pedido],
                                err => err ? reject(err) : resolve()
                            );
                        }));

                        Promise.all(ops).then(() => {
                            conn.commit(errCommit => {
                                conn.release();
                                if (errCommit) return res.status(500).json({ error: errCommit.message });
                                res.json({ mensaje: "Compra realizada ✅", id_pedido, totalFinal, totalBruto, pct, descuento });
                            });
                        }).catch(err => rollback(conn, res, err));
                    }
                );
            }).catch(err => rollback(conn, res, err));
        });
    });
});

router.get("/seguimiento/:id_pedido", (req, res) => {
    db.query(`
        SELECT p.id_pedido, p.estado, p.total, p.descuento_pct, p.descuento_monto,
               p.fecha_pedido, mp.nombre_metodo AS metodo_pago, u.nombre_usuario AS cliente
        FROM pedidos p
        JOIN metodos_pago mp ON p.id_metodo = mp.id_metodo
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        WHERE p.id_pedido = ?
    `, [req.params.id_pedido], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: "Pedido no encontrado" });
        res.json(results[0]);
    });
});

router.get("/historial/:id_usuario", (req, res) => {
    db.query(`
        SELECT p.id_pedido, p.total, p.descuento_pct, p.descuento_monto,
               p.estado, p.fecha_pedido, mp.nombre_metodo AS metodo_pago
        FROM pedidos p
        JOIN metodos_pago mp ON p.id_metodo = mp.id_metodo
        WHERE p.id_usuario = ? ORDER BY p.fecha_pedido DESC
    `, [req.params.id_usuario], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get("/detalle/:id_pedido", (req, res) => {
    db.query(`
        SELECT dp.cantidad, dp.precio, p.nombre_producto, p.imagen,
               (dp.cantidad * dp.precio) AS subtotal
        FROM detalle_pedidos dp
        JOIN productos p ON dp.id_producto = p.id_producto
        WHERE dp.id_pedido = ?
    `, [req.params.id_pedido], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

function rollback(conn, res, err) {
    conn.rollback(() => { conn.release(); res.status(400).json({ error: err.message || "Error en la compra" }); });
}

module.exports = router;
