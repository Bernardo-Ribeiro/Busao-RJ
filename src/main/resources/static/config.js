// Optional runtime configuration for the frontend.
// If you are hosting the static site separately from the Java backend (e.g., Wasmer),
// set API_BASE to the backend base URL (no trailing slash), e.g.:
//   window.API_BASE = 'https://meu-backend.exemplo.com';
// If left empty or undefined, the app falls back to same-origin (location.origin).
window.API_BASE = window.API_BASE || '';
