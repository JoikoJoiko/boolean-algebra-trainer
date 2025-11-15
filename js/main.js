document.addEventListener('DOMContentLoaded', function () {
  var THEME_KEY = 'bat_theme';
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');

  function isLight() {
    return root.classList.contains('page--light');
  }

  function updateToggleText() {
    if (!toggle) return;
    toggle.textContent = isLight() ? 'Тёмная тема' : 'Светлая тема';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var nextIsLight = !isLight();

      root.classList.toggle('page--light', nextIsLight);

      try {
        localStorage.setItem(THEME_KEY, nextIsLight ? 'light' : 'dark');
      } catch (e) {
      }

      updateToggleText();
    });
  }

  updateToggleText();
});
