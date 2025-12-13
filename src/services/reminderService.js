const Booking = require('../models/Booking');
const User = require('../models/User');
const Salon = require('../models/Salon');
const NotificationService = require('./notificationService');

class ReminderService {
  // Check for bookings that need reminders
  static async checkUpcomingBookings() {
    try {
      const now = new Date();
      const thirtyMinsLater = new Date(now.getTime() + 30 * 60000);

      // Find bookings with estimated start time in next 30 mins
      const upcomingBookings = await Booking.find({
        status: 'pending',
        estimatedStartTime: {
          $gte: now,
          $lte: thirtyMinsLater,
        },
        reminderSent: { $ne: true }, // Add this field to track
      })
        .populate('userId', 'name phone fcmToken')
        .populate('salonId', 'name');

      console.log(`📅 Found ${upcomingBookings.length} bookings needing reminders`);

      for (const booking of upcomingBookings) {
        if (booking.userId.fcmToken) {
          await NotificationService.notifyUpcomingBooking(
            booking.userId,
            booking,
            booking.salonId
          );

          // Mark reminder as sent
          booking.reminderSent = true;
          await booking.save();
        }
      }
    } catch (error) {
      console.error('❌ Check reminders error:', error);
    }
  }

  // Check for users who are next in queue
  static async checkTurnApproaching() {
    try {
      // Find bookings with position 1 or 2
      const approachingBookings = await Booking.find({
        status: 'pending',
        queuePosition: { $in: [1, 2] },
        turnNotificationSent: { $ne: true },
      })
        .populate('userId', 'name phone fcmToken')
        .populate('salonId', 'name');

      console.log(`🔔 Found ${approachingBookings.length} turns approaching`);

      for (const booking of approachingBookings) {
        if (booking.userId.fcmToken && booking.queuePosition === 1) {
          await NotificationService.notifyTurnApproaching(
            booking.userId,
            booking,
            booking.salonId
          );

          // Mark notification as sent
          booking.turnNotificationSent = true;
          await booking.save();
        }
      }
    } catch (error) {
      console.error('❌ Check turn approaching error:', error);
    }
  }

  // Start scheduler
  static startScheduler() {
    // Check every 5 minutes
    setInterval(() => {
      this.checkUpcomingBookings();
      this.checkTurnApproaching();
    }, 5 * 60000);

    console.log('⏰ Reminder scheduler started (checks every 5 minutes)');
  }
}

module.exports = ReminderService;
