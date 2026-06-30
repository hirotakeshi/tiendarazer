// routes/login-registro.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "razer_secret_2025";

// ── REGISTRO ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    const { nombre_usuario, email, password } = req.body;

    if (!nombre_usuario || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        db.query(
            "INSERT INTO usuarios (nombre_usuario, email, password, rol) VALUES (?, ?, ?, 'cliente')",
            [nombre_usuario, email, hash],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({ error: "El email ya está registrado" });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ mensaje: "Usuario registrado ✅", id: result.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    db.query(
        "SELECT * FROM usuarios WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!results.length) {
                return res.status(401).json({ error: "Usuario no encontrado" });
            }

            const user  = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(401).json({ error: "Contraseña incorrecta" });
            }

            const token = jwt.sign(
                { id: user.id_usuario, email: user.email, rol: user.rol },
                JWT_SECRET,
                { expiresIn: "8h" }
            );

            res.json({
                mensaje: "Login exitoso 🔥",
                token,
                user: {
                    id:     user.id_usuario,
                    nombre: user.nombre_usuario,
                    email:  user.email,
                    rol:    user.rol
                }
            });
        }
    );
});

module.exports = router;
