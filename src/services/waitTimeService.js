const Booking = require('../models/Booking');

/**
 * Wait Time Calculation Service
 * PRD-compliant with user-specific calculation
 */
class WaitTimeService {
  /**
   * Calculate wait time for a specific user at a salon
   * 
   * CASE 1: userId provided + user in queue → Show ONLY remaining wait until their turn
   * CASE 2: userId not provided OR user not in queue → Show total queue wait time
   * 
   * @param {String} salonId - Salon MongoDB ObjectId
   * @param {String} userId - User ID (optional, null if not authenticated or not in queue)
   * @param {Object} salon - Salon document (optional, for busyMode/maxQueueSize checks)
   * @returns {Promise<Object>} Wait time information
   */
  static async calculateWaitTime(salonId, userId = null, salon = null) {
    try {
      // Get all pending and in-progress bookings, sorted by queue position
      const queueEntries = await Booking.find({
        salonId: salonId,
        status: { $in: ['pending', 'in-progress'] }
      }).sort({ queuePosition: 1 });

      const queueLength = queueEntries.length;

      // EDGE CASE: Empty queue
      if (queueLength === 0) {
        return {
          waitMinutes: 0,
          displayText: 'No wait',
          queueLength: 0,
          status: 'available',
          isInQueue: false,
          timestamp: Date.now()
        };
      }

      let waitMinutes = 0;
      let userEntry = null;
      let userIndex = -1;

      // Check if user is already in queue
      if (userId) {
        userIndex = queueEntries.findIndex(entry => 
          entry.userId.toString() === userId.toString() && 
          entry.status === 'pending'
        );
        if (userIndex !== -1) {
          userEntry = queueEntries[userIndex];
        }
      }

      // ========================================
      // CASE 1: User HAS joined the queue
      // ========================================
      if (userEntry) {
        console.log(`📊 CASE 1: User ${userId} is in queue at position ${userEntry.queuePosition}`);
        
        // Calculate wait time = sum of durations of ALL entries BEFORE user
        // EXCLUDES: User's own service time + everyone after them
        
        for (let i = 0; i < userIndex; i++) {
          const entry = queueEntries[i];
          
          if (entry.status === 'in-progress') {
            // For in-progress service, calculate REMAINING time
            const elapsedMinutes = Math.floor(
              (Date.now() - entry.startedAt.getTime()) / (1000 * 60)
            );
            const remainingMinutes = Math.max(0, entry.totalDuration - elapsedMinutes);
            waitMinutes += remainingMinutes;
            console.log(`   ⏳ Position ${i + 1} (in-progress): ${remainingMinutes} mins remaining`);
          } else {
            // For pending services, add FULL duration
            waitMinutes += entry.totalDuration;
            console.log(`   ⏳ Position ${i + 1} (pending): ${entry.totalDuration} mins`);
          }
        }

        console.log(`   ✅ Total wait for user: ${waitMinutes} mins`);

        return {
          waitMinutes: Math.max(0, waitMinutes),
          displayText: this.formatWaitTime(waitMinutes),
          queueLength: queueLength,
          queuePosition: userEntry.queuePosition,
          status: 'in-queue',
          estimatedStartTime: new Date(Date.now() + waitMinutes * 60 * 1000),
          isInQueue: true,
          timestamp: Date.now()
        };
      }

      // ========================================
      // CASE 2: User has NOT joined the queue
      // ========================================
      console.log(`📊 CASE 2: User ${userId || 'anonymous'} not in queue - calculating total wait`);
      
      // Calculate total wait time if they join RIGHT NOW
      for (const entry of queueEntries) {
        if (entry.status === 'in-progress') {
          // For in-progress service, calculate REMAINING time
          const elapsedMinutes = Math.floor(
            (Date.now() - entry.startedAt.getTime()) / (1000 * 60)
          );
          const remainingMinutes = Math.max(0, entry.totalDuration - elapsedMinutes);
          waitMinutes += remainingMinutes;
        } else {
          // For pending services, add FULL duration
          waitMinutes += entry.totalDuration;
        }
      }

      console.log(`   ✅ Total queue wait: ${waitMinutes} mins (${queueLength} people)`);

      // Check salon-specific conditions
      if (salon) {
        // EDGE CASE: Busy mode
        if (salon.busyMode) {
          return {
            waitMinutes: Math.max(0, waitMinutes),
            displayText: 'Walk-ins only',
            queueLength: queueLength,
            status: 'busy',
            estimatedStartTime: new Date(Date.now() + waitMinutes * 60 * 1000),
            isInQueue: false,
            timestamp: Date.now()
          };
        }

        // EDGE CASE: Queue full
        if (this.isQueueFull(queueLength, salon.activeBarbers, salon.maxQueueSize)) {
          return {
            waitMinutes: Math.max(0, waitMinutes),
            displayText: 'Queue full',
            queueLength: queueLength,
            status: 'full',
            estimatedStartTime: new Date(Date.now() + waitMinutes * 60 * 1000),
            isInQueue: false,
            timestamp: Date.now()
          };
        }
      }

      // Determine status based on wait time
      let status = 'available';
      if (waitMinutes > 45) {
        status = 'very-busy';
      } else if (waitMinutes > 15) {
        status = 'busy';
      }

      return {
        waitMinutes: Math.max(0, waitMinutes),
        displayText: this.formatWaitTime(waitMinutes),
        queueLength: queueLength,
        status: status,
        estimatedStartTime: new Date(Date.now() + waitMinutes * 60 * 1000),
        isInQueue: false,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ Wait time calculation error:', error);
      return {
        waitMinutes: null,
        displayText: 'Wait unavailable',
        queueLength: 0,
        status: 'unavailable',
        isInQueue: false,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Format wait time for display
   */
  static formatWaitTime(minutes) {
    if (minutes === 0) return 'No wait';
    if (minutes <= 5) return '~0-5 min';
    if (minutes < 60) return `~${minutes} min wait`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `~${hours}h wait`;
    return `~${hours}h ${mins}m wait`;
  }

  /**
   * Check if queue is full
   */
  static isQueueFull(queueLength, activeBarbers = 1, maxQueueSize = 20) {
    const dynamicThreshold = activeBarbers + 10;
    const effectiveLimit = Math.min(dynamicThreshold, maxQueueSize);
    return queueLength >= effectiveLimit;
  }

  /**
   * Get wait time for a salon with optional user context
   */
  static async getWaitTimeForSalon(salon, userId = null) {
    // EDGE CASE: Salon closed
    if (!salon.isOpen) {
      return {
        waitMinutes: null,
        displayText: 'Closed',
        queueLength: 0,
        status: 'closed',
        isInQueue: false,
        timestamp: Date.now()
      };
    }

    // EDGE CASE: No active barbers
    if (salon.activeBarbers === 0) {
      return {
        waitMinutes: null,
        displayText: 'Wait unavailable',
        queueLength: 0,
        status: 'unavailable',
        isInQueue: false,
        timestamp: Date.now()
      };
    }

    return await this.calculateWaitTime(salon._id, userId, salon);
  }
}

module.exports = WaitTimeService;
