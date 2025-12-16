import * as ExpoLocation from 'expo-location';
import { Location } from '../types';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const getCurrentLocation = async (): Promise<Location | null> => {
  try {
    // First request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.log('Location permission not granted');
      return null;
    }

    // Get current position with timeout
    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });

    // Try to reverse geocode
    let city: string | undefined;
    let state: string | undefined;
    let zipCode: string | undefined;

    try {
      const reverseGeocode = await ExpoLocation.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        city = address?.city || address?.subregion || undefined;
        state = address?.region || undefined;
        zipCode = address?.postalCode || undefined;
      }
    } catch (geoError) {
      console.log('Reverse geocode failed, using coordinates only:', geoError);
      // Still return the coordinates even if reverse geocode fails
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city,
      state,
      zipCode,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

export const getLocationFromZip = async (zipCode: string): Promise<Location | null> => {
  try {
    // Use a simple geocoding approach
    const geocode = await ExpoLocation.geocodeAsync(`${zipCode}, USA`);

    if (!geocode || geocode.length === 0) {
      console.log('No geocode results for zip:', zipCode);
      return null;
    }

    const { latitude, longitude } = geocode[0];

    // Try to reverse geocode to get city/state
    let city: string | undefined;
    let state: string | undefined;

    try {
      const reverseGeocode = await ExpoLocation.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        city = address?.city || address?.subregion || undefined;
        state = address?.region || undefined;
      }
    } catch (geoError) {
      console.log('Reverse geocode for zip failed:', geoError);
    }

    return {
      latitude,
      longitude,
      city,
      state,
      zipCode,
    };
  } catch (error) {
    console.error('Error geocoding zip:', error);
    return null;
  }
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const formatDistance = (miles: number): string => {
  if (miles < 0.1) {
    return 'nearby';
  }
  if (miles < 1) {
    return `${(miles * 5280).toFixed(0)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};
