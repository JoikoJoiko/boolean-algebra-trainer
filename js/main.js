document.addEventListener('DOMContentLoaded', function () {
  var THEME_KEY = 'bat_theme';
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');

  function isLight() {
    return root.classList.contains('page--light');
  }

  function updateToggleAria() {
    if (!toggle) return;
    toggle.setAttribute(
      'aria-label',
      isLight() ? 'Включить тёмную тему' : 'Включить светлую тему'
    );
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var nextIsLight = !isLight();

      // переключаем класс на <html>
      root.classList.toggle('page--light', nextIsLight);

      // пишем в localStorage
      try {
        localStorage.setItem(THEME_KEY, nextIsLight ? 'light' : 'dark');
      } catch (e) {}

      // обновляем aria-label
      updateToggleAria();
    });
  }

  // при первом запуске просто проставляем aria-label
  updateToggleAria();
});
