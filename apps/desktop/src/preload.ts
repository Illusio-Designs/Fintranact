/**
 * Preload — exposes a minimal, safe bridge to the renderer (contextIsolation on).
 * The device bridge (biometric/printer/scanner) and offline-sync APIs will be
 * surfaced here in later phases, each behind an explicit, audited channel.
 */
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('fintranact', {
  platform: 'windows-desktop',
  version: process.env.npm_package_version ?? '0.0.0',
  // Phase 3-4:
  //   biometric.readPunches(), printer.print(doc), offline.queue(voucher)
});
