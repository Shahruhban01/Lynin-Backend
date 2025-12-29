const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get today's bookings and queue for a salon
router.get('/salon/:salonId/today', async (req, res) => {
  try {
    const { salonId } = req.params;

    // Verify salon exists
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    // Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all bookings for today
    const bookings = await Booking.find({
      salon: salonId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('user', 'name email phone profileImage')
      .populate('services', 'name duration price')
      .sort({ queuePosition: 1 });

    // Group bookings by status
    const grouped = {
      waiting: bookings.filter(b => b.status === 'waiting'),
      inProgress: bookings.filter(b => b.status === 'in-progress'),
      completed: bookings.filter(b => b.status === 'completed'),
      cancelled: bookings.filter(b => b.status === 'cancelled'),
    };

    res.json({
      salon: {
        id: salon._id,
        name: salon.name,
        totalBookings: bookings.length,
      },
      bookings: grouped,
      allBookings: bookings,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start a booking
router.patch('/booking/:bookingId/start', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('user', 'name email phone profileImage')
      .populate('services', 'name duration price');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'in-progress';
    booking.actualStartTime = new Date();
    await booking.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`salon_${booking.salon}`).emit('booking_updated', {
        booking,
        action: 'started',
      });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete a booking
router.patch('/booking/:bookingId/complete', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('user', 'name email phone profileImage')
      .populate('services', 'name duration price');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'completed';
    booking.actualEndTime = new Date();
    await booking.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`salon_${booking.salon}`).emit('booking_updated', {
        booking,
        action: 'completed',
      });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel a booking
router.patch('/booking/:bookingId/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await Booking.findById(req.params.bookingId)
      .populate('user', 'name email phone profileImage')
      .populate('services', 'name duration price');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by salon';
    booking.cancelledAt = new Date();
    await booking.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`salon_${booking.salon}`).emit('booking_updated', {
        booking,
        action: 'cancelled',
      });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
