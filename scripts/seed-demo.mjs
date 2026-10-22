// Creates a demo tenant for trying the portals locally: departments, a manager with two reports, an HR
// admin, and the tenant admin as an employee - all through the backend's public API, so balances,
// workflows and invitations are set up exactly as for a real tenant.
//   npm run seed:demo              tenant key "demo"
//   npm run seed:demo -- acme2     another key
// Needs the backend running with the local profile (LMS_BACKEND_URL in .env.development).

const backend = process.env.LMS_BACKEND_URL;
if (!backend) {
  throw new Error('LMS_BACKEND_URL is not set (see .env.development)');
}
const key = process.argv[2] ?? 'demo';
const domain = `${key}.test`;

async function call(method, path, { token, body } = {}) {
  const response = await fetch(new URL(path, backend), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${method} ${path}: ${response.status} ${data?.detail ?? text}`);
    error.code = data?.errorCode;
    throw error;
  }
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isoDate = (date) => date.toISOString().slice(0, 10);
const monthsFromNow = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return isoDate(date);
};

/** Employees are invited asynchronously: wait until every email is a user that can sign in. */
async function awaitUsers(tenantId, emails) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const users = await call('GET', `/local/directory/tenants/${tenantId}/users`);
    const byEmail = new Map(users.map((user) => [user.email, user]));
    if (emails.every((email) => byEmail.has(email))) {
      return byEmail;
    }
    await sleep(500);
  }
  throw new Error(`Users were not invited in time: ${emails.join(', ')}`);
}

const platform = await call('POST', '/local/tokens/platform', {
  body: { subject: 'seed-demo', ttlMinutes: 10 },
});
let tenant;
try {
  tenant = await call('POST', '/platform/tenants', {
    token: platform.accessToken,
    body: {
      key,
      name: `${key.charAt(0).toUpperCase()}${key.slice(1)} Ltd`,
      defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      adminEmail: `admin@${domain}`,
    },
  });
} catch (error) {
  if (error.code === 'TENANT_KEY_TAKEN') {
    console.log(`Tenant "${key}" already exists - nothing to do. Pass another key to create a second one.`);
    process.exit(0);
  }
  throw error;
}
console.log(`Created tenant ${key} (${tenant.id})`);

const admin = (await awaitUsers(tenant.id, [`admin@${domain}`])).get(`admin@${domain}`);
const { accessToken: token } = await call('POST', '/local/tokens/tenant', {
  body: { subject: admin.subject, tenantId: tenant.id, ttlMinutes: 10 },
});

const department = (code, name) => call('POST', '/api/v1/departments', { token, body: { code, name } });
const people = await department('PEOPLE', 'People');
const engineering = await department('ENG', 'Engineering');

const employee = (code, firstName, lastName, email, departmentId, extra = {}) =>
  call('POST', '/api/v1/employees', {
    token,
    body: {
      employeeCode: code,
      firstName,
      lastName,
      email,
      departmentId,
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      joiningDate: '2024-01-01',
      ...extra,
    },
  });

// The tenant admin becomes an employee too (linked by email), so they can apply for leave
const asha = await employee('E001', 'Asha', 'Rao', `admin@${domain}`, people.id, { gender: 'FEMALE' });
const maya = await employee('E002', 'Maya', 'Fernandes', `maya@${domain}`, engineering.id, {
  gender: 'FEMALE',
  reportingManagerId: asha.id,
});
await employee('E003', 'Arjun', 'Mehta', `arjun@${domain}`, engineering.id, {
  gender: 'MALE',
  reportingManagerId: maya.id,
});
await employee('E004', 'Lena', 'Park', `lena@${domain}`, engineering.id, {
  gender: 'FEMALE',
  reportingManagerId: maya.id,
  employmentStatus: 'PROBATION',
  joiningDate: monthsFromNow(-2),
  probationEndDate: monthsFromNow(4),
});
await employee('E005', 'Ravi', 'Kumar', `ravi@${domain}`, people.id, {
  gender: 'MALE',
  reportingManagerId: asha.id,
});

const users = await awaitUsers(
  tenant.id,
  ['maya', 'arjun', 'lena', 'ravi'].map((name) => `${name}@${domain}`),
);
const grant = (email, roleCodes) =>
  call('PUT', `/api/v1/users/${users.get(email).id}/roles`, { token, body: { roleCodes } });
await grant(`maya@${domain}`, ['EMPLOYEE', 'MANAGER']);
await grant(`ravi@${domain}`, ['EMPLOYEE', 'HR_ADMIN']);

console.log(`
Sign in to tenant "${key}" as:
  admin@${domain}   Asha Rao, tenant admin (People)
  maya@${domain}    Maya Fernandes, manager of Arjun and Lena (Engineering)
  arjun@${domain}   Arjun Mehta, employee
  lena@${domain}    Lena Park, employee on probation
  ravi@${domain}    Ravi Kumar, HR admin`);
