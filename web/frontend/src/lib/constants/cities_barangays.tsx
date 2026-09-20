import citiesData from './cities.json';
import barangaysData from './barangays.json';

const cities: string[] = citiesData;
const barangaysMap: Record<string, string[]> = barangaysData;

export async function getCities(): Promise<string[]> {
  return [...cities];
}

export async function getBarangays(cityName: string): Promise<string[]> {
  return barangaysMap[cityName] || [];
}

export async function getCitiesForRegion(_regionCode?: string): Promise<string[]> {
  return getCities();
}

export async function getAllCities(): Promise<Array<{ name: string; region: string; regionCode: string }>> {
  console.warn('getAllCities is deprecated – using static cities.json');
  return [];
}

export async function getAllBarangays(): Promise<any[]> {
  console.warn('getAllBarangays is deprecated – using static barangays.json');
  return [];
}
