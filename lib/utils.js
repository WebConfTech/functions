const sleep = (seconds = 5) => new Promise((resolve) => setTimeout(
  resolve,
  seconds * 1000,
));

const setOrIncrement = (obj, key, value) => (obj[key] ? (obj[key] + value) : value);

const sortObjectsList = (property, asc = true) => {
  const orderN = asc ? 1 : -1;
  return (a, b) => {
    const propA = a[property];
    const propB = b[property];
    let result = 0;
    if (propA > propB) {
      result = 1 * orderN;
    } else if (propB > propA) {
      result = -1 * orderN;
    }

    return result;
  };
};

module.exports = {
  sleep,
  setOrIncrement,
  sortObjectsList,
};
