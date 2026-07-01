const API       = "/api";
const CART_KEY  = "cart_global";
const USER_KEY  = "razer_user";
const TOKEN_KEY = "razer_token";

function getCart()   { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }
function getUser()   { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
function saveUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function logout()    { localStorage.removeItem(USER_KEY); location.href = "index.html"; }

document.addEventListener("DOMContentLoaded", () => {

    const cartIcon      = document.querySelector(".cart-icon");
    const cartPanel     = document.getElementById("cart-panel");
    const closeCartBtn  = document.getElementById("close-cart");
    const cartItemsCont = document.getElementById("cart-items");
    const cartTotalEl   = document.getElementById("cart-total");
    const cartCountEl   = document.getElementById("cart-count");
    const clearCartBtn  = document.getElementById("clear-cart");
    const buyBtn        = document.getElementById("buy-cart");

    if (cartIcon)    cartIcon.onclick     = () => cartPanel.classList.add("active");
    if (closeCartBtn) closeCartBtn.onclick = () => cartPanel.classList.remove("active");

    // Agregar producto
    document.addEventListener("click", e => {
        const btn = e.target.closest(".add-cart");
        if (!btn) return;

        const cart     = getCart();
        const existing = cart.find(i => i.name === btn.dataset.name);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({
                id:      btn.dataset.id ? parseInt(btn.dataset.id) : null,
                name:    btn.dataset.name,
                price:   parseFloat(btn.dataset.price),
                section: btn.dataset.section,
                qty:     1
            });
        }
        saveCart(cart);
        renderCart();

        const icon = btn.querySelector("i");
        if (icon) {
            icon.classList.replace("fa-basket-shopping", "fa-check");
            setTimeout(() => icon.classList.replace("fa-check", "fa-basket-shopping"), 900);
        }
    });

    // Controles +/- y eliminar
    document.addEventListener("click", e => {
        if (!e.target.classList.contains("qty-plus") &&
            !e.target.classList.contains("qty-minus") &&
            !e.target.classList.contains("remove-item")) return;

        const cart = getCart();
        const idx  = parseInt(e.target.dataset.index);

        if (e.target.classList.contains("qty-plus"))        cart[idx].qty++;
        else if (e.target.classList.contains("qty-minus")) { cart[idx].qty--; if (cart[idx].qty <= 0) cart.splice(idx, 1); }
        else                                                  cart.splice(idx, 1);

        saveCart(cart);
        renderCart();
    });

    if (clearCartBtn) clearCartBtn.onclick = () => { saveCart([]); renderCart(); };

    if (buyBtn) {
        buyBtn.onclick = () => {
            const cart = getCart();
            if (!cart.length) { alert("El carrito está vacío 🛒"); return; }
            const user = getUser();
            if (!user) { alert("Debés iniciar sesión para comprar. Te redirigimos al login."); location.href = "login.html"; return; }
            abrirModalCheckout(user, cart);
        };
    }

    const user = getUser();
    if (user) crearMenuUsuario(user);
    renderCart();

    function renderCart() {
        if (!cartItemsCont) return;
        const cart = getCart();
        cartItemsCont.innerHTML = "";
        document.getElementById("cart-hint")?.remove();

        if (!cart.length) {
            cartItemsCont.innerHTML = '<p style="text-align:center;color:#aaa;margin-top:2rem;">Tu carrito está vacío 🛒</p>';
            if (cartTotalEl) cartTotalEl.innerHTML = '<span style="font-weight:700;">$0</span>';
            if (cartCountEl) cartCountEl.textContent = "0";
            return;
        }

        let total = 0, count = 0;
        cart.forEach((item, index) => {
            total += item.price * item.qty;
            count += item.qty;
            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <span>${item.name}<br><small style="color:#888">${item.section}</small></span>
                <div style="display:flex;align-items:center;gap:5px;">
                    <button class="qty-minus" data-index="${index}">−</button>
                    <span>${item.qty}</span>
                    <button class="qty-plus" data-index="${index}">+</button>
                </div>
                <span>$${(item.price * item.qty).toLocaleString("es-AR")}</span>
                <button class="remove-item" data-index="${index}">❌</button>`;
            cartItemsCont.appendChild(div);
        });

        const totalItems      = cart.reduce((a, i) => a + i.qty, 0);
        const pct             = totalItems >= 3 ? 10 : 0;
        const descMonto       = +(total * pct / 100).toFixed(2);
        const totalFinal      = total - descMonto;
        const envioGratis     = total >= 150000;
        const costoEnvio      = envioGratis ? 0 : 20000;
        const totalConEnvio   = totalFinal + costoEnvio;

        if (cartTotalEl) {
            let html = pct > 0
                ? `<span style="text-decoration:line-through;color:#aaa;font-size:.85em;">$${total.toLocaleString("es-AR")}</span>
                   <span style="color:#00aa55;font-weight:700;display:block;">$${totalFinal.toLocaleString("es-AR")}</span>
                   <small style="display:block;color:#00aa55;font-size:.75em;margin-top:2px;">✅ 10% OFF — Ahorrás $${descMonto.toLocaleString("es-AR")}</small>`
                : `<span style="font-weight:700;">$${total.toLocaleString("es-AR")}</span>`;

            html += envioGratis
                ? `<small style="display:block;color:#4488ff;font-size:.75em;margin-top:4px;">🚚 Envío gratis incluido</small>`
                : `<small style="display:block;color:#e07800;font-size:.75em;margin-top:4px;">🚚 + $20.000 de envío</small>
                   <small style="display:block;color:#888;font-size:.75em;">Total c/envío: <b>$${totalConEnvio.toLocaleString("es-AR")}</b></small>`;

            cartTotalEl.innerHTML = html;

            let hintMsg = "";
            const faltanItems = 3 - totalItems;
            if (faltanItems > 0 && totalItems > 0)
                hintMsg += `<span style="color:#e07800;">Agregá ${faltanItems} producto${faltanItems > 1 ? "s" : ""} más y obtenés 10% OFF 🔥</span>`;
            if (!envioGratis && total > 0)
                hintMsg += `${hintMsg ? "<br>" : ""}<span style="color:#4488ff;">Sumá $${(150000 - total).toLocaleString("es-AR")} más para envío gratis 🚚</span>`;
            if (hintMsg)
                cartTotalEl.insertAdjacentHTML("afterend", `<small id="cart-hint" style="display:block;font-size:.75em;margin-top:4px;line-height:1.6;">${hintMsg}</small>`);
        }
        if (cartCountEl) cartCountEl.textContent = count;
    }
});

/* ── MENÚ USUARIO ── */
function crearMenuUsuario(user) {
    if (!document.getElementById("user-menu-styles")) {
        const style = document.createElement("style");
        style.id = "user-menu-styles";
        style.textContent = `
            .user-icon-wrapper { position:relative;display:inline-flex;align-items:center;justify-content:center; }
            .user-avatar { background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0; }
            .user-avatar i { font-size:1.5rem;color:var(--primary-color,#7a7a7a);transition:color .2s; }
            .user-avatar:hover i, .user-avatar.active i { color:#00ff88; }
            #user-dropdown-menu {
                position:absolute;top:calc(100% + 10px);right:0;background:#7a7a7a;
                border:1px solid #7a7a7a;border-radius:12px;min-width:200px;
                box-shadow:0 20px 60px rgba(0,0,0,.7);overflow:hidden;z-index:99998;
                opacity:0;transform:translateY(-8px) scale(0.96);transform-origin:top right;
                transition:opacity .2s,transform .2s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;
            }
            #user-dropdown-menu.open { opacity:1;transform:translateY(0) scale(1);pointer-events:auto; }
            @media (max-width:768px) {
                #user-dropdown-menu { right:auto;left:50%;transform:translateX(-50%) translateY(-8px) scale(0.96);transform-origin:top center; }
                #user-dropdown-menu.open { transform:translateX(-50%) translateY(0) scale(1); }
            }
            .menu-header { padding:14px 16px 10px;border-bottom:1px solid #1a1a1a; }
            .menu-greeting { font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1.5px;font-family:sans-serif;margin-bottom:3px; }
            .menu-username { font-size:15px;font-weight:700;color:#fff; }
            .menu-email { font-size:11px;color:#555;margin-top:2px;word-break:break-all; }
            .menu-body { padding:6px; }
            .menu-item { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:#ccc;transition:background .15s,color .15s;text-decoration:none;border:none;background:none;width:100%;text-align:left;font-family:sans-serif; }
            .menu-item:hover { background:#1a1a1a;color:#fff; }
            .menu-item.danger { color:rgb(255,0,0); }
            .menu-item.danger:hover { background:rgba(255,68,68,.1);color:rgb(255,0,0); }
            .item-icon { font-size:14px;width:18px;text-align:center; }
        `;
        document.head.appendChild(style);
    }

    const userLink = document.getElementById("user-link");
    if (!userLink) return;

    const wrapper = document.createElement("div");
    wrapper.className = "user-icon-wrapper";

    const avatar = document.createElement("button");
    avatar.className = "user-avatar";
    avatar.id = "user-avatar-btn";
    avatar.title = `Sesión: ${user.nombre}`;
    avatar.innerHTML = `<i class="fa-solid fa-user"></i>`;

    const menu = document.createElement("div");
    menu.id = "user-dropdown-menu";
    menu.innerHTML = `
        <div class="menu-header">
            <div class="menu-greeting">Bienvenido</div>
            <div class="menu-username">${user.nombre}</div>
            <div class="menu-email">${user.email}</div>
        </div>
        <div class="menu-body">
            ${user.rol === "admin" ? `<a href="admin.html" class="menu-item" style="text-decoration:none;"><span class="item-icon">📊</span>Panel de admin</a>` : ""}
            <a href="mis-pedidos.html" class="menu-item" style="text-decoration:none;"><span class="item-icon">📦</span>Mis pedidos</a>
            <a href="compatibilidad.html" class="menu-item" style="text-decoration:none;"><span class="item-icon">🔧</span>Guía de compatibilidad</a>
            <button class="menu-item danger" id="logout-btn"><span class="item-icon">⏻</span>Cerrar sesión</button>
        </div>`;

    wrapper.appendChild(avatar);
    wrapper.appendChild(menu);
    userLink.replaceWith(wrapper);

    avatar.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); avatar.classList.toggle("active"); });
    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) { menu.classList.remove("open"); avatar.classList.remove("active"); }
    });
    document.getElementById("logout-btn").addEventListener("click", () => { menu.classList.remove("open"); logout(); });
}

/* ── MODAL CHECKOUT ── */
async function abrirModalCheckout(user, cart) {
    const totalBruto = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    let descInfo = { pct: 0, descuento: 0, totalFinal: totalBruto, totalBruto };

    try {
        const pr = await fetch(`${API}/pedidos/preview-descuento`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carrito: cart.map(i => ({ id_producto: i.id, cantidad: i.qty, precio: i.price })) })
        });
        descInfo = await pr.json();
    } catch {}

    let modal = document.getElementById("checkout-modal");
    if (!modal) { modal = document.createElement("div"); modal.id = "checkout-modal"; document.body.appendChild(modal); }

    const envioGratis       = descInfo.totalFinal >= 150000;
    const costoEnvioModal   = envioGratis ? 0 : 20000;
    const totalConEnvioModal = descInfo.totalFinal + costoEnvioModal;

    const descHTML = descInfo.pct > 0
        ? `<div style="background:#f0fff7;border:1px solid #00cc66;border-radius:8px;padding:.7rem 1rem;margin-bottom:.8rem;font-size:.83rem;">
               🎉 <b>Descuento del ${descInfo.pct}% aplicado</b><br>
               <span style="color:#555;">Ahorrás <b style="color:#00aa55;">$${Number(descInfo.descuento).toLocaleString("es-AR")}</b></span>
           </div>` : "";

    const envioHTML = envioGratis
        ? `<div style="background:#f0f7ff;border:1px solid #4488ff;border-radius:8px;padding:.7rem 1rem;margin-bottom:.8rem;font-size:.83rem;">
               🚚 <b>¡Envío gratis incluido!</b><br><span style="color:#555;">Tu pedido supera los $150.000</span>
           </div>`
        : `<div style="background:#fffaf0;border:1px solid #e07800;border-radius:8px;padding:.7rem 1rem;margin-bottom:.8rem;font-size:.83rem;">
               🚚 <b>Costo de envío: $20.000</b><br><span style="color:#555;">Comprá más de $150.000 para envío gratis</span>
           </div>`;

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div style="background:#fff;border-radius:14px;width:min(480px,100%);max-height:90vh;overflow-y:auto;padding:2rem;position:relative;">
        <button id="close-checkout-modal" style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.3rem;cursor:pointer;">✖</button>
        <h2 style="font-size:1.3rem;margin-bottom:1.2rem;">Finalizar compra</h2>
        ${descHTML}${envioHTML}
        <div id="checkout-summary" style="background:#f9f9f9;border-radius:8px;padding:1rem;margin-bottom:1.2rem;font-size:.85rem;">
          ${cart.map(i => `<div style="display:flex;justify-content:space-between;padding:.2rem 0;"><span>${i.name} ×${i.qty}</span><span>$${(i.price * i.qty).toLocaleString("es-AR")}</span></div>`).join("")}
          ${descInfo.pct > 0 ? `
          <div style="display:flex;justify-content:space-between;color:#888;padding:.2rem 0;border-top:1px solid #eee;margin-top:.4rem;">
            <span>Subtotal</span><span>$${Number(descInfo.totalBruto).toLocaleString("es-AR")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:#00aa55;padding:.2rem 0;">
            <span>Descuento ${descInfo.pct}%</span><span>−$${Number(descInfo.descuento).toLocaleString("es-AR")}</span>
          </div>` : ""}
          <div style="display:flex;justify-content:space-between;color:${envioGratis ? "#4488ff" : "#e07800"};padding:.2rem 0;">
            <span>🚚 Envío</span><span>${envioGratis ? "Gratis ✓" : "+$20.000"}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #eee;margin-top:.5rem;padding-top:.5rem;">
            <span>Total</span><span>$${totalConEnvioModal.toLocaleString("es-AR")}</span>
          </div>
        </div>
        <label style="font-size:.82rem;color:#555;">Método de pago</label>
        <select id="checkout-metodo" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:8px;margin:.3rem 0 1rem;font-size:.9rem;">
          <option value="1">Efectivo</option>
          <option value="2">Tarjeta de crédito</option>
          <option value="3">Transferencia bancaria</option>
          <option value="4">Mercado Pago</option>
        </select>
        <button id="confirm-checkout-btn" style="width:100%;padding:.85rem;background:#111;color:#fff;border:none;border-radius:8px;font-size:.95rem;font-weight:600;cursor:pointer;">
          Confirmar compra ✅
        </button>
        <p id="checkout-error" style="color:red;font-size:.82rem;margin-top:.6rem;display:none;"></p>
      </div>
    </div>`;

    document.getElementById("close-checkout-modal").onclick = () => modal.remove();

    document.getElementById("confirm-checkout-btn").onclick = async () => {
        const id_metodo = parseInt(document.getElementById("checkout-metodo").value);
        const errEl     = document.getElementById("checkout-error");
        const btn       = document.getElementById("confirm-checkout-btn");
        errEl.style.display = "none";

        if (cart.some(i => !i.id)) {
            errEl.textContent = "Algunos productos no tienen ID asignado.";
            errEl.style.display = "block";
            return;
        }

        btn.textContent = "Procesando...";
        btn.disabled    = true;

        try {
            const resp = await fetch(`${API}/pedidos/checkout`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    id_usuario: user.id,
                    id_metodo,
                    carrito: cart.map(i => ({ id_producto: i.id, nombre: i.name, cantidad: i.qty, precio: i.price }))
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Error en la compra");

            modal.remove();
            saveCart([]);
            mostrarSeguimiento(data.id_pedido, user, cart, data);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = "block";
            btn.textContent = "Confirmar compra ✅";
            btn.disabled    = false;
        }
    };
}

/* ── SEGUIMIENTO ── */
function mostrarSeguimiento(id_pedido, user, cart, compraData) {
    let seg = document.getElementById("seguimiento-modal");
    if (!seg) { seg = document.createElement("div"); seg.id = "seguimiento-modal"; document.body.appendChild(seg); }

    const pasos = [
        { key: "pendiente",  label: "Pedido recibido",  icon: "📋" },
        { key: "procesando", label: "Procesando pago",  icon: "💳" },
        { key: "completado", label: "Compra completada", icon: "✅" },
    ];

    function renderSeg(estado) {
        const idxActual = estado === "completado" ? 2 : estado === "procesando" ? 1 : 0;
        const stepsHTML = pasos.map((p, i) => {
            const done    = i <= idxActual;
            const current = i === idxActual;
            return `
            <div style="display:flex;align-items:center;gap:1rem;padding:.7rem 0;opacity:${done ? 1 : 0.35};">
                <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;
                    background:${done ? (current && estado !== "completado" ? "#fff3cd" : "#d4edda") : "#f0f0f0"};
                    border:2px solid ${done ? (current && estado !== "completado" ? "#ffc107" : "#28a745") : "#ddd"};
                    ${current && estado !== "completado" ? "animation:pulso .9s infinite alternate;" : ""}">
                    ${p.icon}
                </div>
                <div>
                    <div style="font-weight:${current ? 700 : 500};font-size:.92rem;">${p.label}</div>
                    ${current && estado !== "completado" ? '<div style="font-size:.75rem;color:#888;">En progreso...</div>' : ""}
                    ${done && estado === "completado" && i === 2 ? '<div style="font-size:.75rem;color:#28a745;">¡Listo!</div>' : ""}
                </div>
            </div>`;
        }).join('<div style="width:2px;height:12px;background:#eee;margin-left:19px;"></div>');

        const descHTML = compraData.pct > 0 ? `
            <div style="background:#f0fff7;border:1px solid #00cc66;border-radius:8px;padding:.6rem 1rem;margin-bottom:.8rem;font-size:.82rem;">
                🎉 Descuento del <b>${compraData.pct}%</b> aplicado —
                ahorraste <b style="color:#00aa55;">$${Number(compraData.descuento).toLocaleString("es-AR")}</b>
            </div>` : "";

        seg.innerHTML = `
        <style>@keyframes pulso { from{transform:scale(1)} to{transform:scale(1.08)} }</style>
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;">
          <div style="background:#fff;border-radius:14px;width:min(460px,100%);max-height:90vh;overflow-y:auto;padding:2rem;position:relative;">
            <h2 style="font-size:1.2rem;margin-bottom:.3rem;">${estado === "completado" ? "🎉 ¡Compra completada!" : "⏳ Seguimiento del pedido"}</h2>
            <p style="font-size:.78rem;color:#888;margin-bottom:1.2rem;">ORD-${String(id_pedido).padStart(6,"0")}</p>
            ${descHTML}
            <div style="margin-bottom:1.2rem;">${stepsHTML}</div>
            ${estado === "completado"
                ? `<button id="btn-ver-recibo" style="width:100%;padding:.8rem;background:#111;color:#fff;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;margin-bottom:.5rem;">Ver recibo completo 🧾</button>
                   <button id="btn-cerrar-seg" style="width:100%;padding:.7rem;background:#fff;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:.85rem;margin-top:.4rem;">Cerrar</button>`
                : `<div style="background:#fff8e1;border-radius:8px;padding:.7rem 1rem;font-size:.8rem;color:#856404;">⏱ Actualizando automáticamente...</div>`}
          </div>
        </div>`;

        if (estado === "completado") {
            document.getElementById("btn-ver-recibo").onclick = () => {
                seg.remove();
                mostrarRecibo(user, cart, compraData.totalFinal ?? compraData.totalBruto, id_pedido,
                              parseInt(document.getElementById?.("checkout-metodo")?.value) || 1, compraData);
            };
            document.getElementById("btn-cerrar-seg").onclick = () => { seg.remove(); location.reload(); };
        }
    }

    renderSeg("pendiente");

    const intervalo = setInterval(async () => {
        try {
            const r    = await fetch(`${API}/pedidos/seguimiento/${id_pedido}`);
            const data = await r.json();
            renderSeg(data.estado);
            if (data.estado === "completado" || data.estado === "cancelado") clearInterval(intervalo);
        } catch {}
    }, 3000);
}

/* ── RECIBO ── */
function mostrarRecibo(user, carrito, total, id_pedido, id_metodo, compraData = {}) {
    const metodos = { 1: "Efectivo", 2: "Tarjeta de crédito", 3: "Transferencia", 4: "Mercado Pago" };
    const orden   = "ORD-" + String(id_pedido).padStart(6, "0");

    let recibo = document.getElementById("recibo-modal");
    if (!recibo) { recibo = document.createElement("div"); recibo.id = "recibo-modal"; document.body.appendChild(recibo); }

    recibo.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div style="background:#fff;border-radius:14px;width:min(500px,100%);max-height:90vh;overflow-y:auto;">
        <div id="zona-imprimible" style="padding:2.5rem 2.5rem 1.5rem;font-family:sans-serif;font-size:.88rem;line-height:1.6;">
          <h1 style="text-align:center;font-size:1.8rem;margin-bottom:.2rem;letter-spacing:.05em;display:flex;align-items:center;justify-content:center;gap:.4rem;"><i class="fa-solid fa-computer" style="font-size:1.5rem;"></i> RAZER</h1>
          <p style="text-align:center;color:#888;font-size:.75rem;margin-bottom:1.5rem;">Comprobante de compra</p>
          ${[
              ["N° Orden", `<b>${orden}</b>`],
              ["Fecha", new Date().toLocaleString("es-AR")],
              ["Cliente", user.nombre],
              ["Email", user.email],
              ["Pago", metodos[id_metodo]]
          ].map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:.15rem 0;"><span style="color:#777">${k}</span><span>${v}</span></div>`).join("")}
          <hr style="border:none;border-top:1px dashed #ccc;margin:1rem 0;">
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:0 .8rem;color:#888;font-size:.78rem;padding:.2rem 0;border-bottom:1px solid #eee;">
            <span>Producto</span><span>Precio</span><span>Subtotal</span>
          </div>
          ${carrito.map(i => `
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:0 .8rem;padding:.25rem 0;border-bottom:1px dotted #f0f0f0;font-size:.85rem;">
              <span>${i.name} ×${i.qty}</span>
              <span style="text-align:right;color:#555;">$${i.price.toLocaleString("es-AR")}</span>
              <span style="text-align:right;color:#555;">$${(i.price * i.qty).toLocaleString("es-AR")}</span>
            </div>`).join("")}
          <hr style="border:none;border-top:1px dashed #ccc;margin:1rem 0;">
          ${compraData.pct > 0 ? `
          <div style="display:flex;justify-content:space-between;color:#888;font-size:.85rem;">
            <span>Subtotal</span><span>$${Number(compraData.totalBruto).toLocaleString("es-AR")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:#00aa55;font-size:.85rem;">
            <span>Descuento ${compraData.pct}%</span><span>−$${Number(compraData.descuento).toLocaleString("es-AR")}</span>
          </div>` : ""}
          <div style="display:flex;justify-content:space-between;font-size:1.15rem;font-weight:700;">
            <span>Total</span><span>$${total.toLocaleString("es-AR")}</span>
          </div>
          <p style="text-align:center;margin-top:1.5rem;color:#aaa;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;">¡Gracias por tu compra!</p>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid #eee;display:flex;gap:.7rem;">
          <button onclick="window.print()" style="flex:1;padding:.7rem;background:#7a7a7a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;">🖨️ Imprimir recibo</button>
          <button id="cerrar-recibo" style="flex:1;padding:.7rem;background:#fff;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:.85rem;">Cerrar</button>
        </div>
      </div>
    </div>`;

    document.getElementById("cerrar-recibo").onclick = () => { recibo.remove(); location.reload(); };
}

/* ── AUTH HELPERS ── */
async function handleLogin(email, password) {
    const res  = await fetch(`${API}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    saveUser(data.user);
    if (data.token) localStorage.setItem("razer_token", data.token);
    return data;
}

async function handleRegister(nombre_usuario, email, password) {
    const res  = await fetch(`${API}/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nombre_usuario, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al registrarse");
    return data;
}
