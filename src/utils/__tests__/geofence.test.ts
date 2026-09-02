import { calculateDistance, isValidCoordinate, DEFAULT_RADIUS_METERS } from '../geofence';

const MEETING_LAT = -6.123456;
const MEETING_LON = 106.123456;

/** Coordinate `meters` due north of the meeting point. */
function pointAt(meters: number) {
  const offset = (meters / 6371000) * (180 / Math.PI);
  return { lat: MEETING_LAT + offset, lon: MEETING_LON };
}

const accepted = (meters: number) => {
  const p = pointAt(meters);
  return calculateDistance(p.lat, p.lon, MEETING_LAT, MEETING_LON) <= DEFAULT_RADIUS_METERS;
};

describe('calculateDistance (Haversine, meters)', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistance(MEETING_LAT, MEETING_LON, MEETING_LAT, MEETING_LON)).toBe(0);
  });

  it('is accurate to sub-millimeter for the geofence range', () => {
    for (const m of [100, 149.99, 150, 150.01, 200]) {
      const p = pointAt(m);
      expect(calculateDistance(p.lat, p.lon, MEETING_LAT, MEETING_LON)).toBeCloseTo(m, 3);
    }
  });

  it('is symmetric', () => {
    const p = pointAt(150);
    expect(calculateDistance(p.lat, p.lon, MEETING_LAT, MEETING_LON)).toBeCloseTo(
      calculateDistance(MEETING_LAT, MEETING_LON, p.lat, p.lon),
      9
    );
  });
});

describe('geofence rule: distance <= 150 (no tolerance)', () => {
  it.each([100, 149.99, 150])('accepts %p m', (m) => {
    expect(accepted(m)).toBe(true);
  });

  it.each([150.01, 200])('rejects %p m', (m) => {
    expect(accepted(m)).toBe(false);
  });
});

describe('isValidCoordinate', () => {
  it.each([
    [0, 0],
    [-90, -180],
    [90, 180],
    [MEETING_LAT, MEETING_LON],
  ])('accepts (%p, %p)', (lat, lon) => {
    expect(isValidCoordinate(lat, lon)).toBe(true);
  });

  it.each([
    [90.1, 0],
    [-90.1, 0],
    [0, 180.1],
    [0, -180.1],
    [NaN, 0],
    [0, Infinity],
    ['-6.1', 106.1],
    [null, 0],
    [undefined, undefined],
  ])('rejects (%p, %p)', (lat, lon) => {
    expect(isValidCoordinate(lat, lon)).toBe(false);
  });
});
