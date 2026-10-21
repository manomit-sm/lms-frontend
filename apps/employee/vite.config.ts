import { portalConfig } from '../../vite.shared.ts';

export default portalConfig({
  port: 5173,
  requiredEnv: ['VITE_API_BASE_URL', 'VITE_ADMIN_PORTAL_URL'],
});
