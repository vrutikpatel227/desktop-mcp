import { startManaged } from '../../execution-engine/src/process-manager.js';
import { assertWorkspace } from '../../security/src/security.js';
import { detectProject } from './detect.js';

export async function runProject(cwd: string) {
  const dir = assertWorkspace(cwd);
  const info = await detectProject(dir);
  if (!info.devCommand) throw new Error('DEV_COMMAND_NOT_FOUND');
  return startManaged(info.devCommand, dir);
}
