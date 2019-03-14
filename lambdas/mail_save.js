const path = require('path');
const fs = require('fs');
const mailgun = require('mailgun-js');
const statuses = require('statuses');
const { json, send } = require('micro');
const microCors = require('micro-cors-multiple-allow-origin');
const {
  MAILGUN_DOMAIN: domain,
  MAILGUN_API_KEY: apiKey,
  MAILGUN_LIST: listName,
} = require('../env');

const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;

let emailTemplate;
let emailTemplateError = false;
const getEmailTemplate = () => {
  if (emailTemplateError) {
    return;
  }
  if (!emailTemplate) {
    try {
      emailTemplate = fs.readFileSync(
        path.resolve(__dirname, '../templates/mail_registration.html'),
        'utf8'
      );
    } catch (error) {
      emailTemplateError = true;
      console.error(error);
      return;
    }
  }
  return emailTemplate;
}

const handler = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, statuses['ok']);
  }

  const { address } = await json(req);

  if (!address || !address.match(emailRegex)) {
    return send(res, statuses['bad request'], 'La dirección de email es inválida');
  }

  const mg = mailgun({ apiKey, domain });
  let subscribeError;
  try {
    await mg.lists(listName).members().create({
      subscribed: true,
      address
    });
  } catch (error) {
    subscribeError = error;
  }

  if (subscribeError) {
    if (subscribeError.message.match(/already exists/i)) {
      send(
        res,
        statuses['created'],
        'La suscripción se ha realizado correctamente'
      );
    } else {
      send(res, statuses['bad request'], subscribeError.message);
    }
  } else {
    try {
      const html = getEmailTemplate();
      await mg
        .messages()
        .send({
          from: 'WebConf <no-reply@mg.webconf.tech>',
          to: address,
          subject: 'WebConf • ¡Gracias por suscribirte!',
          html
        });
    } catch (error) {
      console.log('Unable to send the welcome email', error);
    }

    send(
      res,
      statuses['created'],
      'La suscripción se ha realizado correctamente'
    );
  }
};

const cors = microCors({
  allowMethods: ['POST'],
  origin: ['https://webconf.tech', 'https://www.webconf.tech']
});
module.exports = cors(handler);
