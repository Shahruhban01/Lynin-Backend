const admin = require('firebase-admin');

class NotificationService {
  // Send notification to specific device
  static async sendToDevice(fcmToken, { title, body, data = {} }) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
        },
        android: {
          priority: 'high',
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Notification sent: ${response}`);
      return response;
    } catch (error) {
      console.error('❌ Notification error:', error);
      throw error;
    }
  }

  // Send to multiple devices
  static async sendToMultipleDevices(fcmTokens, { title, body, data = {} }) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Sent ${response.successCount} notifications`);
      return response;
    } catch (error) {
      console.error('❌ Multicast notification error:', error);
      throw error;
    }
  }

  // ✅ NEW: Send new booking notification to salon owner
  static async notifyNewBooking(owner, booking, customer, salon) {
    if (!owner.fcmToken) {
      console.log('⚠️ Owner FCM token not found');
      return;
    }

    const customerName = customer?.name || 'A customer';

    await this.sendToDevice(owner.fcmToken, {
      title: '🔔 New Booking',
      body: `${customerName} joined the queue at position ${booking.queuePosition}`,
      data: {
        type: 'new_booking',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
        queuePosition: booking.queuePosition.toString(),
        customerName: customerName,
      },
    });

    console.log(`✅ New booking notification sent to owner: ${owner.name}`);
  }

  // Queue position update notification
  static async notifyQueueUpdate(user, booking, salon) {
    if (!user.fcmToken) return;

    const waitMinutes = booking.estimatedStartTime
      ? Math.max(0, Math.round((booking.estimatedStartTime - Date.now()) / 60000))
      : 0;

    await this.sendToDevice(user.fcmToken, {
      title: 'Queue Update',
      body: `You're now #${booking.queuePosition} at ${salon.name}. Estimated wait: ${waitMinutes} mins`,
      data: {
        type: 'queue_update',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
        queuePosition: booking.queuePosition.toString(),
      },
    });
  }

  // Almost your turn notification
  static async notifyAlmostReady(user, booking, salon) {
    if (!user.fcmToken) return;

    await this.sendToDevice(user.fcmToken, {
      title: 'Almost Your Turn!',
      body: `You're next in line at ${salon.name}. Please be ready!`,
      data: {
        type: 'almost_ready',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
      },
    });
  }

  // Booking started notification
  static async notifyBookingStarted(user, booking, salon) {
    if (!user.fcmToken) return;

    await this.sendToDevice(user.fcmToken, {
      title: 'Service Started',
      body: `Your service at ${salon.name} has started!`,
      data: {
        type: 'booking_started',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
      },
    });
  }

  // Booking completed notification
  static async notifyBookingCompleted(user, booking, salon) {
    if (!user.fcmToken) return;

    await this.sendToDevice(user.fcmToken, {
      title: 'Service Completed',
      body: `Your service at ${salon.name} is complete! Please rate your experience.`,
      data: {
        type: 'booking_completed',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
      },
    });
  }

  // Booking cancelled notification
  static async notifyBookingCancelled(user, booking, salon) {
    if (!user.fcmToken) return;

    await this.sendToDevice(user.fcmToken, {
      title: 'Booking Cancelled',
      body: `Your booking at ${salon.name} has been cancelled.`,
      data: {
        type: 'booking_cancelled',
        bookingId: booking._id.toString(),
        salonId: salon._id.toString(),
      },
    });
  }

  // Send reminder when user's turn is approaching
  static async notifyTurnApproaching(user, booking, salon) {
    if (!user.fcmToken) return;

    try {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: '⏰ Your Turn is Approaching!',
          body: `You're next in line at ${salon.name}. Please be ready!`,
        },
        data: {
          type: 'turn_approaching',
          bookingId: booking._id.toString(),
          salonId: salon._id.toString(),
        },
      });

      console.log(`✅ Turn approaching notification sent to user ${user._id}`);
    } catch (error) {
      console.error('❌ Reminder notification error:', error);
    }
  }

  // Send reminder 30 mins before estimated time
  static async notifyUpcomingBooking(user, booking, salon) {
    if (!user.fcmToken) return;

    try {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: '🔔 Booking Reminder',
          body: `Your appointment at ${salon.name} starts in 30 minutes!`,
        },
        data: {
          type: 'booking_reminder',
          bookingId: booking._id.toString(),
          salonId: salon._id.toString(),
        },
      });

      console.log(`✅ Booking reminder sent to user ${user._id}`);
    } catch (error) {
      console.error('❌ Booking reminder error:', error);
    }
  }

  // ✅ NEW: Notify customer about salon closure
  static async notifySalonClosed(customer, salon, reason) {
  try {
    if (!customer.fcmToken) {
      console.log(`⚠️ No FCM token for customer: ${customer.name}`);
      return;
    }

    const message = {
      notification: {
        title: `${salon.name} is now closed`,
        body: `Reason: ${reason}. Please check back later or reschedule your booking.`,
      },
      data: {
        type: 'salon_closed',
        salonId: salon._id.toString(),
        salonName: salon.name,
        reason: reason,
        timestamp: Date.now().toString(),
      },
      token: customer.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Salon closure notification sent to: ${customer.name}`, response);

    return response;
  } catch (error) {
    console.error('❌ Salon closure notification error:', error);
    throw error;
  }
};

}

module.exports = NotificationService;
