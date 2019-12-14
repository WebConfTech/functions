const statuses = require('statuses');
const { send } = require('micro');
const { getClient, searchTweets } = require('../lib/twitter');

const client = getClient();

module.exports = async (req, res) => {
  try {
    const tweets = await searchTweets({
      query: '#apple',
    });
    res.end(JSON.stringify({ tweets: tweets.length }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error on Twitter search: ${err.message}` })
    );
  }
};