// footer/footer.js — Footer compartido para todas las páginas
const footerEl = document.getElementById("footer-container");
if (footerEl) {
    footerEl.innerHTML = `
 <footer class="footer">
  <div class="footer-content">
    <a href="mailto:victoragustindelgado.22231@gmail.com?subject=Consulta%20desde%20RAZER">
      Email: RAZER@support.com
    </a>
      <p>
        <i class="fa-solid fa-computer"></i> &copy; 2025 RAZER
      </p>
  </div>
</footer>`;
}
