const firebaseAdmin = require('firebase-admin');
const envVars = require('../env');

const createCredentials = () => {
  const encodedEmail = encodeURIComponent(envVars.FIREBASE_CLIENT_EMAIL);
  return {
    type: 'service_account',
    project_id: envVars.FIREBASE_PROJECT_ID,
    private_key_id: envVars.FIREBASE_PRIVATE_KEY_ID,
    private_key: envVars.FIREBASE_PRIVATE_KEY,
    client_email: envVars.FIREBASE_CLIENT_EMAIL,
    client_id: envVars.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodedEmail}`,
  };
};

let cachedAdmin = null;
const createAdmin = () => {
  if (!cachedAdmin) {
    cachedAdmin = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(createCredentials()),
    });
  }

  return cachedAdmin;
};

const getDB = (admin = null) => (admin || createAdmin()).firestore();

module.exports = {
  createAdmin,
  getDB,
};
