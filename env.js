let development;
if (process.env.NODE_ENV !== 'production') {
  development = true;
}

const stagingPrefix = 'STAGING_';
const requiredKeys = [
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'MAILGUN_LIST',
  'MAILGUN_SEND_SECRET',
  'HOST',
  'TWITTER_CONSUMER_KEY',
  'TWITTER_CONSUMER_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
];

let envVars = {};
if (
  !development &&
  (process.env.NOW_GITHUB_COMMIT_REF === 'master' || !process.env.NOW_GITHUB_COMMIT_REF)
) {
  envVars = requiredKeys.reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {});
} else {
  envVars = requiredKeys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: process.env[`${stagingPrefix}${key}`] || process.env[key]
    }),
    {}
  );
}

const missing = Object.keys(envVars).find(key => envVars[key] === undefined);
if (missing) {
  console.warn(`Warning! The following environment variable is missing: ${missing}`);
}

module.exports = envVars;
