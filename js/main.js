document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');

  const applySavedTheme = () => {
    const saved = localStorage.getItem('bt_theme');
    const root = document.documentElement;
    if (saved === 'light') {
      root.classList.add('page--light');
    } else {
      root.classList.remove('page--light');
    }
  };

  const updateText = () => {
    if (!toggle) return;
    const isLight = document.documentElement.classList.contains('page--light');
    toggle.textContent = isLight ? 'Тёмная тема' : 'Светлая тема';
  };

  applySavedTheme();
  updateText();

  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const root = document.documentElement;
    const isLight = root.classList.toggle('page--light');
    localStorage.setItem('bt_theme', isLight ? 'light' : 'dark');
    updateText();
  });
});
