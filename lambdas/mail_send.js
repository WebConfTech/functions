const mailgun = require('mailgun-js');
const DOMAIN = '';
const api_key = '';

const mg = mailgun({ apiKey: api_key, domain: DOMAIN });
const data = {
  from: 'WebConf <no-reply@webconf.tech>',
  to: 'gahs94@gmail.com',
  subject: 'WebConf • Nuestro newsletter 🙈',
  text: 'Hola perrix! :D'
};

module.exports = (req, res) => {
  mg.messages().send(data, (error, body) => console.log(body));
};
