function mostrarToast(mensaje, tipo = "success") {
    let toast = document.getElementById("razer-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "razer-toast";
        toast.style.cssText = "position:fixed;bottom:2rem;right:2rem;z-index:99999;padding:.85rem 1.4rem;border-radius:10px;font-size:.9rem;font-weight:600;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .3s;opacity:0;pointer-events:none;max-width:300px;";
        document.body.appendChild(toast);
    }
    const colores = { success: "#00aa55", error: "#e03030", warning: "#e07800" };
    toast.style.background = colores[tipo] || colores.success;
    toast.textContent = mensaje;
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email    = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const errorEl  = document.getElementById("login-error");
            const btn      = loginForm.querySelector("button[type=submit]");
            errorEl.style.display = "none";
            btn.textContent = "Ingresando...";
            btn.disabled    = true;

            try {
                const data = await handleLogin(email, password);
                mostrarToast(`¡Bienvenido ${data.user.nombre}! 🔥`, "success");
                setTimeout(() => location.href = "index.html", 1500);
            } catch (err) {
                errorEl.textContent   = err.message;
                errorEl.style.display = "block";
                mostrarToast(err.message, "error");
                btn.textContent = "Ingresar";
                btn.disabled    = false;
            }
        });
    }

    const regForm = document.getElementById("register-form");
    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre   = document.getElementById("reg-nombre").value.trim();
            const email    = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const confirm  = document.getElementById("reg-confirm").value;
            const errorEl  = document.getElementById("reg-error");
            const btn      = regForm.querySelector("button[type=submit]");
            errorEl.style.display = "none";

            if (password !== confirm) {
                errorEl.textContent = "Las contraseñas no coinciden";
                errorEl.style.display = "block";
                mostrarToast("Las contraseñas no coinciden", "error");
                return;
            }
            if (password.length < 6) {
                errorEl.textContent = "La contraseña debe tener al menos 6 caracteres";
                errorEl.style.display = "block";
                mostrarToast("La contraseña debe tener al menos 6 caracteres", "warning");
                return;
            }

            btn.textContent = "Registrando...";
            btn.disabled    = true;

            try {
                await handleRegister(nombre, email, password);
                mostrarToast("¡Registro exitoso! Redirigiendo... ✅", "success");
                setTimeout(() => location.href = "login.html", 2000);
            } catch (err) {
                errorEl.textContent   = err.message;
                errorEl.style.display = "block";
                mostrarToast(err.message, "error");
                btn.textContent = "Registrarse";
                btn.disabled    = false;
            }
        });
    }
});
