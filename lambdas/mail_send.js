if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_API_KEY;

const mailgun = require('mailgun-js');

const mg = mailgun({ apiKey, domain });
const data = {
  from: 'WebConf <no-reply@webconf.tech>',
  to: 'gahs94@gmail.com',
  subject: 'WebConf • Nuestro newsletter 🙈',
  text: 'Hola perrix! :D'
};

module.exports = (req, res) => {
  mg.messages().send(data, (error, body) => console.log(body));
};
