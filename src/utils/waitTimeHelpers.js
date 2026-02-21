const WaitTimeService = require('../services/waitTimeService');
const Salon = require('../models/Salon');
const logger = require('../utils/logger');

/**
 * Emit personalized wait time updates to all users in a salon room
 * This broadcasts different wait times to each user based on their queue status
 */
async function emitWaitTimeUpdate(salonId) {
  try {
    const salon = await Salon.findById(salonId).lean();
    if (!salon) {
      console.warn('⚠️ Salon not found for wait time update:', salonId);
      return;
    }

    if (!global.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    const roomName = `salon_${salonId}`;
    const room = global.io.sockets.adapter.rooms.get(roomName);

    if (!room || room.size === 0) {
      logger.info(`⚠️ No users connected to salon room: ${roomName}`);
      return;
    }

    logger.info(`🔄 Broadcasting personalized wait times to ${room.size} users in ${roomName}`);

    // For each connected socket in this salon's room
    for (const socketId of room) {
      const socket = global.io.sockets.sockets.get(socketId);
      if (!socket) continue;

      // Get userId from socket (set during authentication)
      const userId = socket.userId || null;

      // Calculate personalized wait time for this specific user
      const waitTime = await WaitTimeService.calculateWaitTime(salonId, userId, salon);

      // Send personalized wait time to this specific socket
      socket.emit('wait_time_updated', {
        salonId: salonId.toString(),
        waitTime: waitTime,
        timestamp: Date.now()
      });

      logger.info(`   ✅ Sent to socket ${socketId} (user: ${userId || 'anonymous'}): ${waitTime.displayText}`);
    }

  } catch (error) {
    logger.error('❌ Error emitting wait time update:', error);
  }
}

/**
 * Attach wait time to multiple salons
 * Used in list endpoints
 * 
 * @param {Array} salons - Array of salon documents
 * @param {String} userId - Optional user ID for personalized wait times
 * @returns {Promise<Array>} Salons with wait time attached
 */
async function attachWaitTimesToSalons(salons, userId = null) {
  return Promise.all(
    salons.map(async (salon) => {
      const waitTime = await WaitTimeService.getWaitTimeForSalon(salon, userId);
      return {
        ...salon,
        waitTime,
      };
    })
  );
}

module.exports = {
  emitWaitTimeUpdate,
  attachWaitTimesToSalons,
};
