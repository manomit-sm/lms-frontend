import { portalConfig } from '../../vite.shared.ts';

export default portalConfig({
  port: 5175,
  requiredEnv: ['VITE_API_BASE_URL'],
});
