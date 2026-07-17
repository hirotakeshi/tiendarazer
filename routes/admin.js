const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Falta configurar la variable de entorno JWT_SECRET");
}

function soloAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer "))
        return res.status(401).json({ error: "No autorizado" });
    try {
        const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET);
        if (payload.rol !== "admin")
            return res.status(403).json({ error: "Acceso denegado — solo admins" });
        req.admin = payload;
        next();
    } catch {
        res.status(401).json({ error: "Token inválido o expirado" });
    }
}

router.get("/resumen", soloAdmin, (req, res) => {
    db.query(`
        SELECT
            (SELECT COUNT(*) FROM pedidos WHERE estado != 'cancelado')               AS total_pedidos,
            (SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado != 'cancelado') AS ingresos_totales,
            (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente')                    AS total_clientes,
            (SELECT COUNT(*) FROM productos WHERE stock < 5)                         AS productos_bajo_stock
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r[0]));
});

router.get("/productos-mas-vendidos", soloAdmin, (req, res) => {
    db.query(`
        SELECT p.nombre_producto, c.nombre_categoria AS categoria,
               SUM(dp.cantidad) AS unidades_vendidas,
               SUM(dp.cantidad * dp.precio) AS ingresos, p.stock AS stock_actual
        FROM detalle_pedidos dp
        JOIN productos p ON dp.id_producto = p.id_producto
        JOIN categorias c ON p.id_categoria = c.id_categoria
        JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
        WHERE pe.estado != 'cancelado'
        GROUP BY p.id_producto ORDER BY unidades_vendidas DESC LIMIT 10
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

router.get("/pedidos", soloAdmin, (req, res) => {
    db.query(`
        SELECT pe.id_pedido, pe.total, pe.estado, pe.fecha_pedido,
               u.nombre_usuario AS cliente, u.email,
               mp.nombre_metodo AS metodo_pago,
               COUNT(dp.id_detalle) AS cantidad_items
        FROM pedidos pe
        JOIN usuarios u ON pe.id_usuario = u.id_usuario
        JOIN metodos_pago mp ON pe.id_metodo = mp.id_metodo
        JOIN detalle_pedidos dp ON dp.id_pedido = pe.id_pedido
        GROUP BY pe.id_pedido ORDER BY pe.fecha_pedido DESC
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

router.get("/pedidos/:id", soloAdmin, (req, res) => {
    db.query(`
        SELECT dp.cantidad, dp.precio, p.nombre_producto,
               (dp.cantidad * dp.precio) AS subtotal
        FROM detalle_pedidos dp
        JOIN productos p ON dp.id_producto = p.id_producto
        WHERE dp.id_pedido = ?
    `, [req.params.id], (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

router.patch("/pedidos/:id/estado", soloAdmin, (req, res) => {
    const { estado } = req.body;
    if (!["pendiente", "completado", "cancelado"].includes(estado))
        return res.status(400).json({ error: "Estado inválido" });
    db.query("UPDATE pedidos SET estado = ? WHERE id_pedido = ?", [estado, req.params.id],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ mensaje: `Estado actualizado a ${estado}` }));
});

router.get("/ventas-por-categoria", soloAdmin, (req, res) => {
    db.query(`
        SELECT c.nombre_categoria AS categoria,
               SUM(dp.cantidad) AS unidades_vendidas,
               SUM(dp.cantidad * dp.precio) AS ingresos
        FROM detalle_pedidos dp
        JOIN productos p ON dp.id_producto = p.id_producto
        JOIN categorias c ON p.id_categoria = c.id_categoria
        JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
        WHERE pe.estado != 'cancelado'
        GROUP BY c.id_categoria ORDER BY ingresos DESC
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

router.get("/stock-bajo", soloAdmin, (req, res) => {
    db.query(`
        SELECT p.nombre_producto, c.nombre_categoria AS categoria, p.stock
        FROM productos p
        JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.stock < 5 ORDER BY p.stock ASC
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

router.get("/pedidos-recientes", soloAdmin, (req, res) => {
    db.query(`
        SELECT pe.id_pedido, pe.total, pe.estado, pe.fecha_pedido,
               u.nombre_usuario AS cliente
        FROM pedidos pe JOIN usuarios u ON pe.id_usuario = u.id_usuario
        ORDER BY pe.fecha_pedido DESC LIMIT 20
    `, (err, r) => err ? res.status(500).json({ error: err.message }) : res.json(r));
});

module.exports = router;
