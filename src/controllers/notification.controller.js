const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// GET /notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(200);
  const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
  return new ApiResponse(200, { notifications, unreadCount }).send(res);
});

// PATCH /notifications/:id/read
const markOneRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return new ApiResponse(200, { notification }).send(res);
});

// PATCH /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  return new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

module.exports = { listNotifications, markOneRead, markAllRead };
