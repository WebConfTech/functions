if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_API_KEY;
const fs = require('fs')
const mailgun = require('mailgun-js');
const mjml2html = require('mjml')

module.exports = (req, res) => {
  fs.readFile(__dirname + './../templates/mail_registration.mjml', 'utf8', function(err, file) {
    mailgun({ domain, apiKey })
      .messages()
      .send(
        {
          from: 'WebConf <no-reply@webconf.tech>',
          to: 'persi93@gmail.com',
          subject: 'WebConf • Nuestro newsletter 🙈',
          html: mjml2html(file).html
        },
        (error, body) => res.end(JSON.stringify({ error, body }))
      );
  })
};
