// routes/recuperar.js — Recuperación de contraseña con código de 6 dígitos
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const bcrypt  = require("bcrypt");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const CODIGO_VALIDO_MINUTOS = 10;

// ── PASO 1: Solicitar código ───────────────────────────────────
// POST /api/recuperar/solicitar-codigo  body: { email }
router.post("/solicitar-codigo", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "El email es obligatorio" });

    db.query("SELECT id_usuario FROM usuarios WHERE email = ?", [email], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: "No existe una cuenta con ese email" });

        // Generar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        db.query(
            "UPDATE usuarios SET reset_code = ?, reset_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE email = ?",
            [codigo, CODIGO_VALIDO_MINUTOS, email],
            async (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // ── Envío real del email con Resend ──
                try {
                    await resend.emails.send({
                        from: "RAZER <recuperacion@tienda-razer.is-a.dev>",
                        to:      email,
                        subject: "Tu código de recuperación — RAZER",
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                                <h2 style="color:#151515;">RAZER</h2>
                                <p>Usá este código para recuperar tu contraseña:</p>
                                <div style="font-size:32px;font-weight:bold;letter-spacing:6px;
                                            background:#f0f0f0;padding:16px 24px;border-radius:10px;
                                            text-align:center;color:#151515;margin:20px 0;">
                                    ${codigo}
                                </div>
                                <p style="color:#777;font-size:13px;">
                                    Este código vence en ${CODIGO_VALIDO_MINUTOS} minutos.
                                    Si no solicitaste este cambio, ignorá este correo.
                                </p>
                            </div>`
                    });
                } catch (mailErr) {
                    console.error("❌ Error enviando email:", mailErr.message);
                    return res.status(500).json({ error: "No se pudo enviar el email. Intentá de nuevo más tarde" });
                }

                res.json({ mensaje: "Código enviado a tu email 📧" });
            }
        );
    });
});

// ── PASO 2: Verificar código ────────────────────────────────────
// POST /api/recuperar/verificar-codigo  body: { email, codigo }
router.post("/verificar-codigo", (req, res) => {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: "Faltan datos" });

    db.query(
        "SELECT reset_code, reset_expira FROM usuarios WHERE email = ?",
        [email],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

            const user = rows[0];
            if (!user.reset_code || user.reset_code !== codigo) {
                return res.status(400).json({ error: "Código incorrecto" });
            }
            if (new Date(user.reset_expira) < new Date()) {
                return res.status(400).json({ error: "El código expiró. Solicitá uno nuevo" });
            }

            res.json({ mensaje: "Código válido ✅" });
        }
    );
});

// ── PASO 3: Resetear contraseña ────────────────────────────────
// POST /api/recuperar/resetear-password  body: { email, codigo, password }
router.post("/resetear-password", async (req, res) => {
    const { email, codigo, password } = req.body;
    if (!email || !codigo || !password) return res.status(400).json({ error: "Faltan datos" });
    if (password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

    db.query(
        "SELECT reset_code, reset_expira FROM usuarios WHERE email = ?",
        [email],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

            const user = rows[0];
            if (!user.reset_code || user.reset_code !== codigo) {
                return res.status(400).json({ error: "Código incorrecto" });
            }
            if (new Date(user.reset_expira) < new Date()) {
                return res.status(400).json({ error: "El código expiró. Solicitá uno nuevo" });
            }

            const hash = await bcrypt.hash(password, 10);

            // Cambiar contraseña y limpiar el código usado
            db.query(
                "UPDATE usuarios SET password = ?, reset_code = NULL, reset_expira = NULL WHERE email = ?",
                [hash, email],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ mensaje: "Contraseña actualizada ✅" });
                }
            );
        }
    );
});

module.exports = router;
