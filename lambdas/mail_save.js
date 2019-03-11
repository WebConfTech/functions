if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_API_KEY;
const listName = process.env.MAILGUN_LIST;

const mailgun = require('mailgun-js');
const statuses = require('statuses');
const { json, send } = require('micro');
const microCors = require('micro-cors-multiple-allow-origin');
const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
const path = require('path');
const fs = require('fs');

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

  if (address && address.match(emailRegex)) {
    return mailgun({ apiKey, domain })
      .lists(listName)
      .members()
      .create(
        {
          subscribed: true,
          address
        },
        (err, data) => {
          if (err) {
            send(res, statuses['bad request'], err.message);
          } else {
            send(
              res,
              statuses['created'],
              'La suscripción se ha realizado correctamente'
            );

            const html = getEmailTemplate();
            mailgun({ domain, apiKey })
              .messages()
              .send(
                {
                  from: 'WebConf <no-reply@webconf.tech>',
                  to: address,
                  subject: 'WebConf • ¡Gracias por suscribirte!',
                  html
                },
                (error, { message }) => console.error(error, message)
              );
          }
        }
      );
  }

  return send(res, statuses['bad request'], 'La dirección de email es inválida');
};

const cors = microCors({
  allowMethods: ['POST'],
  origin: ['https://webconf.tech', 'https://www.webconf.tech']
});
module.exports = cors(handler);
