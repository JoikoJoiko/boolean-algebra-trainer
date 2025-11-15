document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const updateText = () => {
    const isLight = document.body.classList.contains('page--light');
    toggle.textContent = isLight ? 'Тёмная тема' : 'Светлая тема';
  };

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('page--light');
    updateText();
  });

  updateText();
});
