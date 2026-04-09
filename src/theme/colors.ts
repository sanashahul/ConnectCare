/**
 * Trauma-Informed Color Palette
 *
 * Calmer, warmer, less-saturated colors chosen for a user base often
 * experiencing acute stress. Key principles:
 *
 *  - Earth tones instead of bright primaries
 *  - Red reserved for life-threatening emergencies (911 / 988)
 *  - Amber for "important but not panic" alerts
 *  - Soft sage / terracotta / ochre category colors
 *  - Warm neutrals for backgrounds
 *
 * This module is imported where centralized theming is easy. Some older
 * files still reference hex codes directly — those are being migrated
 * gradually.
 */

export const colors = {
  // HEALTH — sage green (calming, associated with healing/nature)
  health: {
    main: '#5E8B7E',
    bg: '#EAF2EE',
    bgAccent: '#D4E5DD',
    border: '#B8D4C9',
    textDark: '#2F5548',
    text: '#456B5E',
  },
  // HOUSING — warm terracotta (grounded, home-like)
  housing: {
    main: '#C68568',
    bg: '#F8EBE2',
    bgAccent: '#F1DDD0',
    border: '#E8CAB8',
    textDark: '#6B3E2A',
    text: '#8B4F35',
  },
  // JOBS — warm ochre (stable, productive without being aggressive)
  jobs: {
    main: '#B8915A',
    bg: '#F6EEDD',
    bgAccent: '#EFE3C8',
    border: '#E4D1A2',
    textDark: '#5E4620',
    text: '#7A5C28',
  },
  // AI / accent — dusty blue
  accent: {
    main: '#5C7C99',
    bg: '#E8EEF3',
    bgAccent: '#D1DCE7',
    border: '#BFD0DF',
    textDark: '#2D4558',
    text: '#3E5A73',
  },
  // URGENT (non-crisis) — soft amber
  urgent: {
    main: '#D97706',
    bg: '#FDF4E3',
    bgAccent: '#FBEAC6',
    border: '#E4BE76',
    textDark: '#7A4E1F',
    text: '#92661F',
  },
  // CRISIS ONLY — muted red, for 988 / 911 cards
  crisis: {
    main: '#B95252',
    bg: '#FADEDE',
    border: '#E8A4A4',
    textDark: '#5C1F1F',
  },
  // YOUTH — warm sage (slightly lighter than health)
  youth: {
    main: '#7A9670',
    bg: '#EBF0EA',
    bgAccent: '#D8E0D5',
    border: '#C8D4BF',
    textDark: '#3E5237',
    text: '#5A6E52',
  },
  // NEUTRALS — warm whites and earth grays
  neutral: {
    surface: '#FAF8F5',
    surfaceElevated: '#FFFFFF',
    border: '#E8E4DC',
    text: '#4A4236',
    textMuted: '#7A7163',
    textSubtle: '#A39A8B',
  },
} as const;
