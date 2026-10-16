import { describe, it, expect } from 'vitest';
import {
  datesOverlap,
  isRoomAvailable,
  getAvailableRooms,
} from '../api/_lib/availability.js';

describe('datesOverlap', () => {
  it('returns false when ranges are adjacent (a before b)', () => {
    expect(datesOverlap('2024-06-01', '2024-06-05', '2024-06-05', '2024-06-10')).toBe(false);
  });

  it('returns false when ranges are adjacent (b before a)', () => {
    expect(datesOverlap('2024-06-05', '2024-06-10', '2024-06-01', '2024-06-05')).toBe(false);
  });

  it('returns false when a is entirely before b', () => {
    expect(datesOverlap('2024-06-01', '2024-06-03', '2024-06-05', '2024-06-10')).toBe(false);
  });

  it('returns false when b is entirely before a', () => {
    expect(datesOverlap('2024-06-10', '2024-06-15', '2024-06-01', '2024-06-05')).toBe(false);
  });

  it('returns true when ranges overlap (a starts inside b)', () => {
    expect(datesOverlap('2024-06-03', '2024-06-08', '2024-06-01', '2024-06-06')).toBe(true);
  });

  it('returns true when ranges overlap (b starts inside a)', () => {
    expect(datesOverlap('2024-06-01', '2024-06-08', '2024-06-05', '2024-06-12')).toBe(true);
  });

  it('returns true when one range contains the other', () => {
    expect(datesOverlap('2024-06-01', '2024-06-20', '2024-06-05', '2024-06-10')).toBe(true);
  });

  it('returns true for identical ranges', () => {
    expect(datesOverlap('2024-06-01', '2024-06-10', '2024-06-01', '2024-06-10')).toBe(true);
  });
});

describe('isRoomAvailable', () => {
  const existingBookings = [
    { roomId: 'room-1', checkIn: '2024-06-05', checkOut: '2024-06-10' },
    { roomId: 'room-2', checkIn: '2024-07-01', checkOut: '2024-07-07' },
  ];

  it('returns true when room has no existing bookings', () => {
    expect(isRoomAvailable('room-3', '2024-06-01', '2024-06-05', existingBookings)).toBe(true);
  });

  it('returns true when dates do not overlap existing booking', () => {
    expect(isRoomAvailable('room-1', '2024-06-10', '2024-06-15', existingBookings)).toBe(true);
  });

  it('returns false when dates overlap existing booking', () => {
    expect(isRoomAvailable('room-1', '2024-06-07', '2024-06-12', existingBookings)).toBe(false);
  });

  it('returns false when dates are contained within existing booking', () => {
    expect(isRoomAvailable('room-1', '2024-06-06', '2024-06-09', existingBookings)).toBe(false);
  });

  it('returns true when same dates are for a different room', () => {
    expect(isRoomAvailable('room-1', '2024-07-01', '2024-07-07', existingBookings)).toBe(true);
  });

  it('returns true when existingBookings is empty', () => {
    expect(isRoomAvailable('room-1', '2024-06-01', '2024-06-05', [])).toBe(true);
  });
});

describe('getAvailableRooms', () => {
  const rooms = [
    { id: 'room-1', name: 'Ocean Suite' },
    { id: 'room-2', name: 'Garden Room' },
    { id: 'room-3', name: 'Mountain View' },
  ];

  const existingBookings = [
    { roomId: 'room-1', checkIn: '2024-06-05', checkOut: '2024-06-10' },
  ];

  it('returns all rooms when none are booked in the period', () => {
    const available = getAvailableRooms('2024-06-01', '2024-06-04', existingBookings, rooms);
    expect(available).toHaveLength(3);
  });

  it('excludes rooms with conflicting bookings', () => {
    const available = getAvailableRooms('2024-06-06', '2024-06-09', existingBookings, rooms);
    expect(available.map((r) => r.id)).not.toContain('room-1');
    expect(available).toHaveLength(2);
  });

  it('returns empty array when all rooms are booked', () => {
    const allBooked = rooms.map((r) => ({
      roomId: r.id,
      checkIn: '2024-06-05',
      checkOut: '2024-06-10',
    }));
    const available = getAvailableRooms('2024-06-06', '2024-06-08', allBooked, rooms);
    expect(available).toHaveLength(0);
  });

  it('returns all rooms when existingBookings is empty', () => {
    const available = getAvailableRooms('2024-06-01', '2024-06-30', [], rooms);
    expect(available).toHaveLength(3);
  });
});
