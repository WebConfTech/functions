const { send } = require('micro');
const statuses = require('statuses');
const { upload } = require('micro-upload');
const mailgun = require('mailgun-js');
const { readFileSync } = require('fs');
const path = require('path');

const {
  MAILGUN_DOMAIN: domain,
  MAILGUN_API_KEY: apiKey,
  MAILGUN_SEND_SECRET: secret_key
} = require('../env');

const applyParameters = (params, target) =>
  Object.keys(params).reduce(
    (template, parameter) =>
      template.replace(
        new RegExp(`%${parameter.toLowerCase()}%`, 'g'),
        params[parameter]
      ),
    target
  );

module.exports = upload(async (req, res) => {
  const {
    listName,
    subject,
    specificAddress,
    secret,
    templateName,
    templateParameters
  } = req.body;

  if (!templateName) {
    if (!(req.files && req.files.file && req.files.file.mimetype === 'text/html')) {
      return send(
        res,
        statuses['bad request'],
        JSON.stringify({ error: `Error - Missing HTML file` })
      );
    }

    if (
      !(req.files && req.files.textFile && req.files.textFile.mimetype === 'text/plain')
    ) {
      return send(
        res,
        statuses['bad request'],
        JSON.stringify({ error: `Error - Missing text file` })
      );
    }
  }

  if (
    !(
      templateName &&
      !(req.files && req.files.textFile && req.files.textFile.mimetype === 'text/plain')
    )
  ) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - Missing template` })
    );
  }
  if (secret !== secret_key) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - Wrong secret` })
    );
  }

  const html = templateName
    ? readFileSync(path.resolve(__dirname, `../templates/${templateName}.html`)).toString(
        'utf8'
      )
    : req.files.file.data.toString('utf8');
  const text = templateName
    ? readFileSync(path.resolve(__dirname, `../templates/${templateName}.txt`)).toString(
        'utf8'
      )
    : req.files.textFile.data.toString('utf8');

  const jsonTemplateParameters = JSON.parse(templateParameters);

  const htmlWithParameters = applyParameters(jsonTemplateParameters, html);
  const textWithParameters = applyParameters(jsonTemplateParameters, text);

  const mg = mailgun({ domain, apiKey });

  const messageData = {
    subject,
    to: specificAddress,
    html: htmlWithParameters,
    text: textWithParameters,
    from: 'WebConf <no-reply@mg.webconf.tech>',
    attachment: Object.keys(req.files || {})
      // Exclude e-mail templates
      .filter(fileKey => !['file', 'textFile'].includes(fileKey))
      // Arraify the file list
      .map(fileKey => req.files[fileKey])
      // Convert each file to a Mailgun Attachment
      .map(
        file =>
          new mg.Attachment({
            contentType: file.mimetype,
            filename: file.name,
            data: file.data,
            knownLength: file.size || file.data.length
          })
      )
  };

  if (listName) {
    try {
      const listMembers = await mg
        .lists(listName)
        .members()
        .list();
      const subscribedMembers = listMembers.items.filter(user => user.subscribed);

      messageData.to = subscribedMembers.map(user => user.address);
      messageData['recipient-variables'] = subscribedMembers.reduce(
        (accumulator, user) => ({ ...accumulator, [user.address]: user }),
        {}
      );
    } catch (err) {
      return send(
        res,
        statuses['bad request'],
        JSON.stringify({ error: `Error - On list load ${err.message}` })
      );
    }
  }

  try {
    const { message } = await mg.messages().send(messageData);

    return send(
      res,
      statuses['ok'],
      JSON.stringify({ status: message, sentTo: messageData.to })
    );
  } catch (err) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error - On Email send ${err.message}` })
    );
  }
});
