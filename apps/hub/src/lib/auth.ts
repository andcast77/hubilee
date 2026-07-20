/**
 * Re-export shared auth utilities.
 * Apps can import directly from @hubilee/shared/auth
 * or use this local re-export for backward compatibility.
 */
export {
  getTokenFromCookie,
  setTokenCookie,
  clearTokenCookie,
  hasApiSession,
} from '@hubilee/shared/auth'
