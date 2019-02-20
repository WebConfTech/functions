const mailgun = require('mailgun-js');
const statuses = require('statuses');
const { json, send } = require('micro');

const domain = '';
const apiKey = '';
const listName = '';
const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;

module.exports = async (req, res) => {
  const { address } = await json(req);

  let message;
  let status = statuses['bad request'];

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
            send(res, statuses['created'], 'The address was successfully subscribed');
          }
        }
      );
  }

  return send(res, statuses['bad request'], 'Invalid email address');
};
