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
      return send(res, statuses['not acceptable'], {
        message: 'Invalid payload',
      });
    }

    if (!mg.validateWebhook(
      data.signature.timestamp,
      data.signature.token,
      data.signature.signature,
    )) {
      return send(res, statuses['not allowed'], {
        message: 'Invalid signature',
      });
    }

    const { recipient: address } = data['event-data'];
    await mg
      .lists(listName)
      .members(address)
      .delete();
    await mg
      .unsubscribes(address)
      .delete();
  } catch (error) {
    return send(res, statuses['not acceptable'], {
      message: `Unexpected error: ${error.message}`,
    });
  }

  return send(res, statuses.ok, {});
};
