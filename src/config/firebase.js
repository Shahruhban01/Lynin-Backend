const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Function to verify Firebase ID token
const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid Firebase token');
  }
};

module.exports = { admin, verifyFirebaseToken };
