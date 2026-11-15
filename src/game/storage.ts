/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createInitialWorkshopState,
  MAX_OFFLINE_SECONDS,
  SCHEMA_VERSION,
} from './constants';
import { OfflineReport, WorkshopState } from './types';

const STORAGE_KEY = 'graphite_cedar_save_v1';

export function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function saveWorkshopState(state: WorkshopState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: WorkshopState = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      lastSavedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        checksum: fnv1aHash(serialized),
        state: payload,
      })
    );
  } catch {
    // ignore storage quota errors
  }
}

function hydrateState(raw: Partial<WorkshopState>): WorkshopState {
  const base = createInitialWorkshopState();
  return {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    materials: { ...base.materials, ...raw.materials },
    inventory: { ...base.inventory, ...raw.inventory },
    params: { ...base.params, ...raw.params },
    accessibility: { ...base.accessibility, ...raw.accessibility },
    stages: raw.stages?.length === base.stages.length ? raw.stages : base.stages,
    techs:
      raw.techs?.length === base.techs.length
        ? raw.techs
        : base.techs.map((t) => raw.techs?.find((rt) => rt.id === t.id) ?? t),
    // Schema 2 additions — old saves simply fall back to a clean baseline.
    comboHeat: typeof raw.comboHeat === 'number' ? raw.comboHeat : 0,
    stats: { ...base.stats, ...(raw.stats ?? {}) },
    activeEvent: raw.activeEvent ?? null,
  };
}

export function loadWorkshopState(): {
  state: WorkshopState;
  offlineReport: OfflineReport | null;
} {
  const fallback = createInitialWorkshopState();
  if (typeof localStorage === 'undefined') {
    return { state: fallback, offlineReport: null };
  }

  try {
    const rawJson = localStorage.getItem(STORAGE_KEY);
    if (!rawJson) return { state: fallback, offlineReport: null };

    const parsed = JSON.parse(rawJson);
    if (!parsed || !parsed.state) return { state: fallback, offlineReport: null };

    const serializedState = JSON.stringify(parsed.state);
    if (fnv1aHash(serializedState) !== parsed.checksum) {
      return { state: fallback, offlineReport: null };
    }

    const hydrated = hydrateState(parsed.state);
    const now = Date.now();
    const rawElapsed = Math.max(0, Math.floor((now - hydrated.lastSavedAt) / 1000));
    const elapsedSeconds = Math.min(rawElapsed, MAX_OFFLINE_SECONDS);

    if (elapsedSeconds < 30) {
      return { state: hydrated, offlineReport: null };
    }

    const ecoUnlocked = hydrated.techs.find((t) => t.id === 'eco_lacquer')?.unlocked ?? false;
    const lacquerPerPencil = ecoUnlocked ? 0.45 : 0.7;

    const maxCraftable = Math.min(
      Math.floor(hydrated.materials.cedarLogs),
      Math.floor(hydrated.materials.graphitePowder),
      Math.floor(hydrated.materials.lacquerLiters / lacquerPerPencil)
    );
    const avgLevel =
      hydrated.stages.reduce((acc, s) => acc + s.machineLevel, 0) / hydrated.stages.length;
    const craftedPencils = Math.min(
      maxCraftable,
      Math.floor((elapsedSeconds / 8) * (0.6 + avgLevel * 0.25))
    );
    const earnedCredits = Math.round(elapsedSeconds * 0.35 * avgLevel + craftedPencils * 4);

    if (craftedPencils <= 0 && earnedCredits <= 0) {
      return { state: hydrated, offlineReport: null };
    }

    const updatedState: WorkshopState = {
      ...hydrated,
      credits: hydrated.credits + earnedCredits,
      totalPencilsCrafted: hydrated.totalPencilsCrafted + craftedPencils,
      materials: {
        cedarLogs: Math.max(0, Number((hydrated.materials.cedarLogs - craftedPencils).toFixed(2))),
        graphitePowder: Math.max(
          0,
          Number((hydrated.materials.graphitePowder - craftedPencils).toFixed(2))
        ),
        lacquerLiters: Math.max(
          0,
          Number((hydrated.materials.lacquerLiters - craftedPencils * lacquerPerPencil).toFixed(2))
        ),
      },
      inventory: {
        ...hydrated.inventory,
        standard: hydrated.inventory.standard + craftedPencils,
      },
      lastSavedAt: now,
    };

    return {
      state: updatedState,
      offlineReport: {
        elapsedSeconds,
        earnedCredits,
        craftedPencils,
      },
    };
  } catch {
    return { state: fallback, offlineReport: null };
  }
}

export function clearWorkshopSave(): WorkshopState {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createInitialWorkshopState();
}
