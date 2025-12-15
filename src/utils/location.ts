import * as ExpoLocation from 'expo-location';
import { Location } from '../types';

export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async (): Promise<Location | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });

    // Reverse geocode to get city/state
    const reverseGeocode = await ExpoLocation.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const address = reverseGeocode[0];

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: address?.city || undefined,
      state: address?.region || undefined,
      zipCode: address?.postalCode || undefined,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

export const getLocationFromZip = async (zipCode: string): Promise<Location | null> => {
  try {
    const geocode = await ExpoLocation.geocodeAsync(zipCode + ', USA');
    if (geocode.length === 0) {
      return null;
    }

    const { latitude, longitude } = geocode[0];

    // Reverse geocode to get city/state
    const reverseGeocode = await ExpoLocation.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const address = reverseGeocode[0];

    return {
      latitude,
      longitude,
      city: address?.city || undefined,
      state: address?.region || undefined,
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
