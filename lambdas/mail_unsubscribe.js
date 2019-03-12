if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_API_KEY;
const listName = process.env.MAILGUN_LIST;

const { send, json } = require('micro');
const statuses = require('statuses');
const mailgun = require('mailgun-js');

module.exports = async (req, res) => {
  const mg = mailgun({ apiKey, domain });
  try {
    const data = await json(req);
    if (!(data && data['event-data'] && data['event-data'].recipient)) {
      console.error('error 0', data)
      return send(res, statuses['not acceptable'], {})
    }

    if (!mg.validateWebhook(data.signature.timestamp, data.signature.token, data.signature.signature)) {
      console.error('error 0.5', data.signature)
      return send(res, statuses['not allowed'], {})
    }
    console.log('LiST_>', listName)
    console.log('holis', data['event-data'].recipient)
    const deletion = await mg
      .lists(listName)
      .members(data['event-data'].recipient)
      .delete();
    console.log('deletion', deletion)

  } catch (error) {
    console.error('error 1', error)
    return send(res, statuses['not acceptable'], {})
  }
  return send(res, statuses['ok'], {})
};
