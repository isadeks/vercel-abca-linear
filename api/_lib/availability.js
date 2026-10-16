/**
 * Room and date availability checks.
 *
 * No external dependencies — this is the foundation layer of the booking
 * engine. All other modules that need conflict detection import from here.
 */

/**
 * Returns true when two half-open date ranges [aIn, aOut) and [bIn, bOut)
 * overlap. String comparison works correctly for ISO-8601 date strings
 * ("YYYY-MM-DD") without Date parsing.
 *
 * @param {string} aIn   ISO date string e.g. "2024-06-01"
 * @param {string} aOut  ISO date string
 * @param {string} bIn   ISO date string
 * @param {string} bOut  ISO date string
 * @returns {boolean}
 */
export function datesOverlap(aIn, aOut, bIn, bOut) {
  return aIn < bOut && aOut > bIn;
}

/**
 * Returns true when a room has no conflicting booking in existingBookings.
 *
 * @param {string} roomId
 * @param {string} checkIn   ISO date string
 * @param {string} checkOut  ISO date string
 * @param {Array<{roomId: string, checkIn: string, checkOut: string}>} existingBookings
 * @returns {boolean}
 */
export function isRoomAvailable(roomId, checkIn, checkOut, existingBookings) {
  return !existingBookings.some(
    (booking) =>
      booking.roomId === roomId &&
      datesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
  );
}

/**
 * Returns only the rooms that are available for the requested date window.
 *
 * @param {string} checkIn
 * @param {string} checkOut
 * @param {Array<{roomId: string, checkIn: string, checkOut: string}>} existingBookings
 * @param {Array<{id: string}>} rooms
 * @returns {Array<{id: string}>}
 */
export function getAvailableRooms(checkIn, checkOut, existingBookings, rooms) {
  return rooms.filter((room) =>
    isRoomAvailable(room.id, checkIn, checkOut, existingBookings),
  );
}
