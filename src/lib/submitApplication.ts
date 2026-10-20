import type { MigrationApplication } from '../types/application';

/**
 * Mock frontend-only submission boundary. Replace the body with an API call
 * when a backend is ready; do not persist applicant data from this demo.
 */
export async function submitApplication(_application: MigrationApplication): Promise<void> {
  await new Promise(resolve => window.setTimeout(resolve, 700));
}
