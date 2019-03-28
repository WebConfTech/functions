// To validate possible missing env vars.
require('../env');

module.exports = (req, res) => {
  res.end(JSON.stringify({ pong: true }));
};
