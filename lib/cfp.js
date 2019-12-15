const { getDB } = require('./firebase');

const COLLECTIONS = {
  OPTIONS: 'options',
};

const OPTIONS = {
  SEARCH_VALUE: 'search',
  LAST_RESULT_ID: 'lastResultId',
};


let cachedOptions = null;
const getOptions = async (db = null) => {
  if (cachedOptions) {
    return cachedOptions;
  }

  const useDB = db || getDB();
  const docs = await useDB.collection(COLLECTIONS.OPTIONS).get();
  cachedOptions = {};
  docs.forEach((doc) => {
    const data = doc.data();
    cachedOptions[data.name] = {
      value: data.value,
      doc,
    };
  });

  return cachedOptions;
};

const updateLastResultId = async (id, doc = null, db = null) => {
  let newDoc;
  if (doc) {
    await doc.update({ value: id });
    newDoc = doc;
  } else {
    const useDB = db || getDB();
    newDoc = await useDB.collection(COLLECTIONS.OPTIONS).add({
      name: OPTIONS.LAST_RESULT_ID,
      value: id,
    });
  }

  if (cachedOptions) {
    cachedOptions[OPTIONS.LAST_RESULT_ID] = {
      value: id,
      doc: newDoc,
    };
  }
}

module.exports = {
  COLLECTIONS,
  OPTIONS,
  getOptions,
  updateLastResultId,
};