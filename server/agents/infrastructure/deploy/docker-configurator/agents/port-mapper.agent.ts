import type { PortMapping } from '../types.js';

export const mapPorts = (targetPort = 3000, hostPort = targetPort): ReadonlyArray<PortMapping> =>
  Object.freeze([
    {
      containerPort: targetPort,
      hostPort,
      protocol: 'tcp',
    },
  ]);
