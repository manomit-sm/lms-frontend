import { api } from '../runtime';
import type { OrgNames } from './policyRules';

/** Names of departments, designations and locations, for describing who something applies to. */
export function useOrgNames(): OrgNames {
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const designations = api.query.useQuery('get', '/api/v1/designations');
  const locations = api.query.useQuery('get', '/api/v1/locations');
  const byId = (items: { id?: string; name?: string }[] | undefined) =>
    new Map((items ?? []).map((item) => [item.id, item.name]));
  return {
    departments: byId(departments.data),
    designations: byId(designations.data),
    locations: byId(locations.data),
  };
}
