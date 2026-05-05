import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

export interface AppConfig {
  bggUsername?: string;
  bggPassword?: string;
  // cached from last successful login
  bggSessionId?: string;
  bggSessionExpiry?: string; // ISO timestamp
}

function read(): AppConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function write(cfg: AppConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

export function getConfig(): AppConfig {
  return read();
}

export function setConfig(patch: Partial<AppConfig>): void {
  write({ ...read(), ...patch });
}
