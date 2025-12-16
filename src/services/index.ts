/**
 * Services Index
 * Exports all API services for the app
 */

export * from './healthcareApi';
export * from './employmentApi';
export * from './housingApi';

// Re-export main functions with clearer names
export { getAllHealthcareResources as getHealthcareResources } from './healthcareApi';
export { getAllEmploymentResources as getEmploymentResources } from './employmentApi';
export { getAllHousingResources as getHousingResources } from './housingApi';
