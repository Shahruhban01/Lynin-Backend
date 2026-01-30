const Booking = require('../models/Booking');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_ATTEMPTS = 30;

/**
 * Generate random unique token (A00-Z99)
 * Unique among active bookings only
 */
async function generateWalkInToken(salonId) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];

    const number = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');

    const token = `${letter}${number}`;

    const exists = await Booking.exists({
      salonId,
      walkInToken: token,
      status: { $in: ['pending', 'in-progress'] },
    });

    if (!exists) {
      return token;
    }
  }

  throw new Error('Token pool exhausted. Try again.');
}

module.exports = {
  generateWalkInToken,
};
