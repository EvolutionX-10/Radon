// Redemption requests must use the shared service so every entry point has the
// same cooldown, receipt protection and publisher limits.
export type { ClaimResult } from '../../redemption/service.js';
