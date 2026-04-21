import { AdminService } from './admin.service.js';

export async function checkFeatureFlag(key: string): Promise<boolean> {
  return AdminService.checkFeatureFlag(key);
}
