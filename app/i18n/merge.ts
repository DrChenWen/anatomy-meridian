import { organStructures, type HotspotStructure, type OrganId, type OrganStructure } from "../lib/anatomy-data";
import type { OrganContent, OrganContentDictionary } from "./types";

/** Structure joined with the active locale's prose. Components consume this
 *  shape, so they never need to know a translation layer exists. */
export type Hotspot = HotspotStructure & { label: string; detail: string };
export type Organ = Omit<OrganStructure, "hotspots"> & Omit<OrganContent, "hotspots"> & { hotspots: Hotspot[] };

export function buildOrgans(content: OrganContentDictionary): Organ[] {
  return organStructures.map((structure) => {
    const prose = content[structure.id];
    if (!prose) {
      // Fallback: render the meridian with English IDs as labels (partial localization)
      return {
        ...structure,
        name: structure.system,
        system: structure.system,
        description: structure.organ + " channel",
        poetic: structure.organ,
        yinYang: structure.meridianType === "yin" ? "Yin" : structure.meridianType === "yang" ? "Yang" : "Extraordinary",
        primaryOrgan: structure.organ,
        element: "—",
        peakTime: "—",
        location: structure.region,
        function: "—",
        dailyFact: "—",
        medical: "—",
        keyPoint: structure.yuanPoint,
        funFact: "—",
        tissue: "—",
        comparison: "—",
        conditions: [],
        hotspots: structure.hotspots.map((hotspot) => ({
          ...hotspot,
          label: hotspot.ta,
          detail: hotspot.ta,
        })),
      };
    }
    return {
      ...structure,
      ...prose,
      hotspots: structure.hotspots.map((hotspot) => {
        const proseHotspot = prose.hotspots[hotspot.id];
        return {
          ...hotspot,
          // Fall back to the meridian ID if a locale has not translated this
          // hotspot yet — never render an empty label.
          label: proseHotspot?.label ?? hotspot.ta,
          detail: proseHotspot?.detail ?? hotspot.ta,
        };
      }),
    };
  });
}

export function indexOrgans(organs: Organ[]): Record<OrganId, Organ> {
  return Object.fromEntries(organs.map((organ) => [organ.id, organ])) as Record<OrganId, Organ>;
}
