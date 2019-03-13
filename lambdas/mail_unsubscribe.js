const { send, json } = require('micro');
const statuses = require('statuses');
const mailgun = require('mailgun-js');
const {
  MAILGUN_DOMAIN: domain,
  MAILGUN_API_KEY: apiKey,
  MAILGUN_LIST: listName,
} = require('../env');

module.exports = async (req, res) => {
  const mg = mailgun({ apiKey, domain });
  try {
    const data = await json(req);
    if (!(data && data['event-data'] && data['event-data'].recipient)) {
      console.error('INVALID DATA', data);
      return send(res, statuses['not acceptable'], {});
    }

    if (!mg.validateWebhook(data.signature.timestamp, data.signature.token, data.signature.signature)) {
      console.error('INVALID SIGNATURE', data.signature);
      return send(res, statuses['not allowed'], {});
    }

    console.log('UNSUBSCRIBE', data['event-data'].recipient, 'FROM', listName);
    const deletion = await mg
      .lists(listName)
      .members(data['event-data'].recipient)
      .delete();

    console.log('SUCCESS?', deletion);
  } catch (error) {
    console.error('UNEXPECTED ERROR', error)
    return send(res, statuses['not acceptable'], {});
  }

  return send(res, statuses['ok'], {});
};
