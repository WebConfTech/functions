if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_API_KEY;
const secret_key = process.env.SECRET_SEND_KEY;

const { send } = require('micro');
const statuses = require('statuses');
const { upload } = require('micro-upload')
const mailgun = require('mailgun-js');

module.exports = upload(async (req, res) => {
  const { listName, subject, specificAddress, secret } = req.body;

  if (!(req.files && req.files.file && req.files.file.mimetype === 'text/html')) {
    return send(res, statuses['bad request'], JSON.stringify({ error: `Error - On list load No file uploaded or wrong file format` }));
  }

  if (secret !== secret_key) {
    return send(res, statuses['bad request'], JSON.stringify({ error: `Error - Wrong secret` }));
  }

  const messageData = {
    subject,
    to: specificAddress,
    html: req.files.file.data.toString('utf8'),
    from: 'WebConf <no-reply@webconf.tech>'
  };

  if (listName) {
    try {
      const listMembers = await mailgun({ domain, apiKey }).lists(listName).members().list();
      const subscribedMembers = listMembers.items.filter(user => user.subscribed);

      messageData.to = subscribedMembers.map(user => user.address);
      messageData['recipient-variables'] = subscribedMembers.reduce(
        (accumulator, user) =>
          ({ ...accumulator, [user.address]: user }), {}
      );
    } catch (err) {
      return send(res, statuses['bad request'], JSON.stringify({ error: `Error - On list load ${err.message}` }));
    }
  }

  try {
    const { message } = await mailgun({ domain, apiKey }).messages().send(messageData);
    return send(res, statuses['ok'], JSON.stringify({ status: message, sentTo: messageData.to }));
  } catch (err) {
    return send(res, statuses['bad request'], JSON.stringify({ error: `Error - On Email send ${err.message}` }))
  }
});