import { portalConfig } from '../../vite.shared.ts';

export default portalConfig({
  port: 5174,
  requiredEnv: ['VITE_API_BASE_URL', 'VITE_EMPLOYEE_PORTAL_URL'],
});
