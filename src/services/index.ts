/**
 * Services Index
 * Exports all API services for the app.
 *
 * The three main category fetchers are wrapped with `enrichLocation`, so the
 * Location object passed to the housing/healthcare/employment APIs always has
 * lat/lng AND city/state/zipCode populated (via geocoding if needed). This
 * keeps the three APIs accurate and in sync regardless of how the user
 * originally set their location (auto-detect vs ZIP code fallback).
 */

import { Location } from '../types';
import { enrichLocation } from '../utils/enrichLocation';
import { getAllHealthcareResources } from './healthcareApi';
import { getAllEmploymentResources } from './employmentApi';
import { getAllHousingResources } from './housingApi';

export * from './healthcareApi';
export * from './employmentApi';
export * from './housingApi';

// Wrapped fetchers — always enrich the location first so all three APIs get
// the most complete location data possible.
export const getHealthcareResources = async (location: Location) => {
  const enriched = await enrichLocation(location);
  return getAllHealthcareResources(enriched);
};

export const getEmploymentResources = async (location: Location) => {
  const enriched = await enrichLocation(location);
  return getAllEmploymentResources(enriched);
};

export const getHousingResources = async (location: Location) => {
  const enriched = await enrichLocation(location);
  return getAllHousingResources(enriched);
};
