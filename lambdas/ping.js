if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

module.exports = (req, res) => {
  res.end(JSON.stringify({ pong: true }));
};
