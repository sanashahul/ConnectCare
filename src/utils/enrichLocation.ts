/**
 * Location Enrichment
 *
 * Ensures a Location object has all fields (lat/lng AND city/state/zipCode)
 * populated before being passed to downstream APIs. This is important because:
 *
 *  - The HUD Housing Counselor API requires a zipCode
 *  - The NPI Registry API requires both city AND state
 *  - The USAJobs API works best with city + state (falls back to state only)
 *  - The HRSA API primarily uses lat/lng but falls back to zipCode
 *
 * If any of these fields are missing, API results silently degrade.
 * This helper fills in the gaps via forward/reverse geocoding so all three
 * APIs (housing, healthcare, employment) receive the same, complete location.
 */

import * as ExpoLocation from 'expo-location';
import { Location } from '../types';

const hasValidCoords = (loc: Location): boolean =>
  !!loc && (loc.latitude !== 0 || loc.longitude !== 0);

const hasCompleteAddress = (loc: Location): boolean =>
  !!loc && !!loc.city && !!loc.state && !!loc.zipCode;

/**
 * Enrich a Location so it has lat/lng AND city/state/zipCode where possible.
 * Never throws — returns the original location on any geocoding failure.
 */
export const enrichLocation = async (
  location: Location | null | undefined,
): Promise<Location> => {
  if (!location) {
    return { latitude: 0, longitude: 0 };
  }

  // Fast path: already fully populated
  if (hasValidCoords(location) && hasCompleteAddress(location)) {
    return location;
  }

  let enriched: Location = { ...location };

  // Step 1: If we have a zip but no coords, forward-geocode
  if (!hasValidCoords(enriched) && enriched.zipCode) {
    try {
      const geo = await ExpoLocation.geocodeAsync(`${enriched.zipCode}, USA`);
      if (geo && geo.length > 0) {
        enriched = {
          ...enriched,
          latitude: geo[0].latitude,
          longitude: geo[0].longitude,
        };
      }
    } catch (error) {
      console.log('enrichLocation forward-geocode failed:', error);
    }
  }

  // Step 2: If we have coords but missing address fields, reverse-geocode
  if (hasValidCoords(enriched) && !hasCompleteAddress(enriched)) {
    try {
      const reverse = await ExpoLocation.reverseGeocodeAsync({
        latitude: enriched.latitude,
        longitude: enriched.longitude,
      });
      if (reverse && reverse.length > 0) {
        const addr = reverse[0];
        enriched = {
          ...enriched,
          city: enriched.city || addr?.city || addr?.subregion || undefined,
          state: enriched.state || addr?.region || undefined,
          zipCode: enriched.zipCode || addr?.postalCode || undefined,
        };
      }
    } catch (error) {
      console.log('enrichLocation reverse-geocode failed:', error);
    }
  }

  return enriched;
};
