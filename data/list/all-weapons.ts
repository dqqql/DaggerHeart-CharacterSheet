import { primaryWeapons, Weapon as BaseWeapon } from "./primary-weapon";
import { secondaryWeapons } from "./secondary-weapon";
import { hopeFearPrimaryWeapons, hopeFearSecondaryWeapons } from "./hope-fear-equipment";

// This interface matches the Weapon interface in weapon-selection-modal.tsx
export interface CombinedWeapon extends BaseWeapon {
    id: string;
    weaponType: "primary" | "secondary";
}

export const allWeapons: CombinedWeapon[] = [
    ...primaryWeapons.map((weapon) => ({
        ...weapon,
        id: weapon.名称, // Add id from 名称
        weaponType: "primary" as const,
    })),
    ...secondaryWeapons.map((weapon) => ({
        ...weapon,
        id: weapon.名称, // Add id from 名称
        weaponType: "secondary" as const,
    })),
];

export function getAllWeapons(includeHopeFear: boolean): CombinedWeapon[] {
    if (!includeHopeFear) return allWeapons;
    return [
        ...allWeapons,
        ...hopeFearPrimaryWeapons.map(weapon => ({ ...weapon, id: weapon.名称, weaponType: "primary" as const })),
        ...hopeFearSecondaryWeapons.map(weapon => ({ ...weapon, id: weapon.名称, weaponType: "secondary" as const })),
    ];
}
