const Booking = require('../models/Booking');

/**
 * Wait Time Calculation Service
 * Implements PRD-compliant wait time estimation
 */
class WaitTimeService {
  /**
   * Calculate estimated wait time for a salon
   * 
   * @param {String} salonId - Salon MongoDB ObjectId
   * @param {Number} activeBarbers - Number of active barbers (min 0)
   * @param {Number} avgServiceDuration - Average service duration in minutes
   * @returns {Promise<Object>} Wait time information
   */
  static async calculateWaitTime(salonId, activeBarbers = 1, avgServiceDuration = 30) {
    try {
      // PRD EDGE CASE: No active barbers
      if (activeBarbers === 0) {
        return {
          waitMinutes: null,
          displayText: 'Wait unavailable',
          queueLength: 0,
          status: 'unavailable',
        };
      }

      // Fetch all active bookings (pending + in-progress)
      const activeBookings = await Booking.find({
        salonId,
        status: { $in: ['pending', 'in-progress'] },
      })
        .sort({ queuePosition: 1 })
        .select('status totalDuration startedAt')
        .lean();

      const queueLength = activeBookings.length;

      // PRD EDGE CASE: Empty queue → 0 minutes
      if (queueLength === 0) {
        return {
          waitMinutes: 0,
          displayText: 'No wait',
          queueLength: 0,
          status: 'available',
        };
      }

      // STEP 1: Calculate total remaining workload
      let totalRemainingMinutes = 0;
      const now = Date.now();

      for (const booking of activeBookings) {
        if (booking.status === 'in-progress') {
          // Calculate remaining time for active service
          const elapsedMs = booking.startedAt 
            ? now - booking.startedAt.getTime() 
            : 0;
          const elapsedMinutes = elapsedMs / 60000;
          const remaining = Math.max(0, (booking.totalDuration || avgServiceDuration) - elapsedMinutes);
          totalRemainingMinutes += remaining;
        } else {
          // Full service time for waiting customers
          totalRemainingMinutes += booking.totalDuration || avgServiceDuration;
        }
      }

      // STEP 2: Divide by active barbers (parallel processing)
      const baseWaitTime = totalRemainingMinutes / activeBarbers;

      // STEP 3: Add 25% buffer (PRD requirement: 25-30%)
      const BUFFER_MULTIPLIER = 1.25;
      const estimatedWait = baseWaitTime * BUFFER_MULTIPLIER;

      // STEP 4: Round to nearest 5 minutes
      const roundedWait = Math.ceil(estimatedWait / 5) * 5;

      // STEP 5: Generate display text
      const displayText = this.formatWaitTime(roundedWait);

      return {
        waitMinutes: roundedWait,
        displayText,
        queueLength,
        status: 'available',
        calculatedAt: new Date(),
      };

    } catch (error) {
      console.error('❌ Wait time calculation error:', error);
      return {
        waitMinutes: null,
        displayText: 'Wait unavailable',
        queueLength: 0,
        status: 'error',
      };
    }
  }

  /**
   * Format wait time for display (PRD-compliant)
   * Always use ~ prefix for approximation
   * 
   * @param {Number} minutes - Wait time in minutes
   * @returns {String} Formatted display text
   */
  static formatWaitTime(minutes) {
    // PRD: Empty queue shows 0
    if (minutes === 0) {
      return 'No wait';
    }

    // PRD: 0-5 minutes
    if (minutes <= 5) {
      return '~0-5 min';
    }

    // Less than 60 minutes
    if (minutes < 60) {
      return `~${minutes} min wait`;
    }

    // 60+ minutes: show hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `~${hours}h wait`;
    }

    return `~${hours}h ${mins}m wait`;
  }

  /**
   * Check if queue is full (PRD edge case)
   * 
   * @param {Number} queueLength - Current queue length
   * @param {Number} activeBarbers - Active barbers
   * @param {Number} maxQueueSize - Maximum allowed queue size
   * @returns {Boolean}
   */
  static isQueueFull(queueLength, activeBarbers, maxQueueSize = 20) {
    // PRD: Queue full = barbers + 10 waiting customers OR max queue size
    const dynamicThreshold = activeBarbers + 10;
    const effectiveLimit = Math.min(dynamicThreshold, maxQueueSize);
    return queueLength >= effectiveLimit;
  }

  /**
   * Build complete wait time response with all edge cases
   * 
   * @param {Object} salon - Salon document
   * @returns {Promise<Object>} Complete wait time info
   */
  static async getWaitTimeForSalon(salon) {
    // PRD EDGE CASE: Salon closed
    if (!salon.isOpen) {
      return {
        waitMinutes: null,
        displayText: 'Closed',
        queueLength: 0,
        status: 'closed',
      };
    }

    // Calculate wait time
    const waitTime = await this.calculateWaitTime(
      salon._id,
      salon.activeBarbers || 1,
      salon.averageServiceDuration || 30
    );

    // PRD EDGE CASE: Busy mode
    if (salon.busyMode) {
      return {
        ...waitTime,
        displayText: waitTime.displayText,
        status: 'busy',
        label: 'Walk-ins only',
      };
    }

    // PRD EDGE CASE: Queue full
    const queueFull = this.isQueueFull(
      waitTime.queueLength,
      salon.activeBarbers || 1,
      salon.maxQueueSize || 20
    );

    if (queueFull) {
      return {
        waitMinutes: null,
        displayText: 'Queue full',
        queueLength: waitTime.queueLength,
        status: 'full',
      };
    }

    return waitTime;
  }
}

module.exports = WaitTimeService;
