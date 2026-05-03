import type { GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateRbac = (roles: string[], permissions: string[]): GeneratedFile[] => {
  const roleMap = roles
    .map((role) => `  ${role}: [${permissions.map((permission) => `'${permission}'`).join(', ')}],`)
    .join('\n');

  return [
    createGeneratedFile(
      'generated/auth/rbac/roles.ts',
      `
export const rolePermissions = {
${roleMap}
} as const;

export const hasPermission = (role: keyof typeof rolePermissions, permission: string) =>
  rolePermissions[role]?.includes(permission) ?? false;
`,
    ),
  ];
};
