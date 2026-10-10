/* Apply the saved motion preference before the first page paint. */
try {
  if (localStorage.getItem('guanghan-motion') === 'off') document.documentElement.dataset.motion = 'off';
} catch { /* Storage is optional. */ }
