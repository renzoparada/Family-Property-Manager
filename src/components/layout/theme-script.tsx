// Inline, blocking script so the correct theme applies before first paint
// (avoids a light-mode flash for users with a stored dark preference).
export function ThemeScript() {
  const code = `
    try {
      const stored = localStorage.getItem('fpm_theme');
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.classList.add(stored);
      }
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
