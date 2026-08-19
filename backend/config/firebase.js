const admin = require('firebase-admin');

try {
  let serviceAccount;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase initialized with FIREBASE_SERVICE_ACCOUNT');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log('Firebase initialized with GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    throw new Error('Firebase credentials not found in environment variables.');
  }
} catch (error) {
  console.warn('WARNING: Firebase could not be initialized:', error.message);
  console.warn('Falling back to mock Firebase Admin SDK. Authentication features may not work as expected.');
  
  const mockAdmin = {
    auth: () => ({
      verifyIdToken: async () => null
    })
  };
  
  module.exports = {
    admin: mockAdmin,
    auth: mockAdmin.auth()
  };
  // Stop execution here to avoid exporting the uninitialized admin
}

if (admin.apps && admin.apps.length > 0) {
    module.exports = {
      admin,
      auth: admin.auth()
    };
}
