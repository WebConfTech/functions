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
  if (!(req.files && req.files.file && req.files.file.mimetype === 'text/html')) {
    return send(res, statuses['bad request'], 'Error - No file uploaded or wrong file format');
  }

  const { listName, subject, specificAddress, secret } = req.body;
  if (secret === secret_key) {
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
      } catch (error) {
        return send(res, statuses['bad request'], 'Error - On list load ' + JSON.stringify(error));
      }
    }
    mailgun({ domain, apiKey }).messages().send(messageData).then(
      ({ message, id }) =>
        send(res, statuses['ok'], JSON.stringify({ message, sentTo: messageData.to })),
      err =>
        send(res, statuses['bad request'], 'Error - On Email send ' + JSON.stringify(err))
    );
  } else {
    send(res, statuses['bad request'], 'Clave Incorrecta');
  }
});