// footer/footer.js — Footer compartido para todas las páginas
const footerEl = document.getElementById("footer-container");
if (footerEl) {
    footerEl.innerHTML = `
 <footer class="footer">
  <div class="footer-content">
    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=victoragustindelgado.22231@gmail.com" target="_blank" rel="noopener">
      Email: RAZER@support.com
    </a>
      <p>
        <i class="fa-solid fa-computer"></i> &copy; 2025 RAZER
      </p>
  </div>
</footer>`;
}
