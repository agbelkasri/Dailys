const { initializeApp } = require('firebase-admin/app');

// Initialize Firebase Admin SDK
initializeApp();

// Export all Cloud Functions
const { createDailyReport } = require('./createDailyReport');
const { sendDailyEmail } = require('./sendDailyEmail');

module.exports = {
  createDailyReport,
  sendDailyEmail,
};
