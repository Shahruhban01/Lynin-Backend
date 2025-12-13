const WaitTimeService = require('../services/waitTimeService');
const Salon = require('../models/Salon');

/**
 * Emit wait time update via Socket.io
 * Called after queue-changing events (PRD update triggers)
 * 
 * @param {String} salonId - Salon ID
 */
async function emitWaitTimeUpdate(salonId) {
  try {
    const salon = await Salon.findById(salonId).lean();
    if (!salon) {
      console.warn('⚠️ Salon not found for wait time update:', salonId);
      return;
    }

    const waitTime = await WaitTimeService.getWaitTimeForSalon(salon);

    // Emit to salon room (owner dashboard)
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('wait_time_updated', {
        salonId: salonId.toString(),
        waitTime,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`✅ Wait time updated for salon ${salon.name}: ${waitTime.displayText}`);
  } catch (error) {
    console.error('❌ Error emitting wait time update:', error);
  }
}

/**
 * Attach wait time to multiple salons
 * Used in list endpoints
 * 
 * @param {Array} salons - Array of salon documents
 * @returns {Promise<Array>} Salons with wait time attached
 */
async function attachWaitTimesToSalons(salons) {
  return Promise.all(
    salons.map(async (salon) => {
      const waitTime = await WaitTimeService.getWaitTimeForSalon(salon);
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
