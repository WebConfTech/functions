const { send } = require('micro');
const statuses = require('statuses');
const { upload } = require('micro-upload')
const mailgun = require('mailgun-js');
const {
  MAILGUN_DOMAIN: domain,
  MAILGUN_API_KEY: apiKey,
  MAILGUN_SEND_SECRET: secret_key,
} = require('../env');

module.exports = upload(async (req, res) => {
  const { listName, subject, specificAddress, secret } = req.body;

  if (!(req.files && req.files.file && req.files.file.mimetype === 'text/html')) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - On list load - Missing HTML file` })
    );
  }

  if (
    !(req.files && req.files.textFile && req.files.textFile.mimetype === 'text/plain')
  ) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - On list load - Missing text file` })
    );
  }

  if (secret !== secret_key) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - Wrong secret` })
    );
  }

  const messageData = {
    subject,
    to: specificAddress,
    html: req.files.file.data.toString('utf8'),
    text: req.files.textFile.data.toString('utf8'),
    from: 'WebConf <no-reply@mg.webconf.tech>'
  };

  const mg = mailgun({ domain, apiKey });
  if (listName) {
    try {
      const listMembers = await mg
        .lists(listName)
        .members()
        .list();
      const subscribedMembers = listMembers.items.filter(user => user.subscribed);

      messageData.to = subscribedMembers.map(user => user.address);
      messageData['recipient-variables'] = subscribedMembers.reduce(
        (accumulator, user) =>
          ({ ...accumulator, [user.address]: user }), {}
      );
    } catch (err) {
      return send(
        res,
        statuses['bad request'],
        JSON.stringify({ error: `Error - On list load ${err.message}` })
      );
    }
  }

  try {
    const { message } = await mg
      .messages()
      .send(messageData);

    return send(
      res,
      statuses['ok'],
      JSON.stringify({ status: message, sentTo: messageData.to })
    );
  } catch (err) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - On Email send ${err.message}` })
    );
  }
});
