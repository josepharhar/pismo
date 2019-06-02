const pismoutil = require('./pismoutil.js');

function testParseJsonValid() {
  const obj = {
    nested: {
      str: 'str',
      num: 1234,
      bool: true
    },
    array: [
      'one',
      'two'
    ]
  };
  const schema = {
    nested: {
      str: 'string',
      num: 'number',
      bool: 'boolean'
    },
    array: ['string']
  };

  pismoutil.parseJson(JSON.stringify(obj), schema);
}

function testParseJsonInvalid() {
  const obj = {
    nested: {
      str: 'str',
      num: 'this should be a number',
      bool: true
    },
    array: [
      'one',
      'two'
    ]
  };
  const schema = {
    nested: {
      str: 'string',
      num: 'number',
      bool: 'boolean'
    },
    array: ['string']
  };

  let error = null;
  try {
    pismoutil.parseJson(JSON.stringify(obj), schema);
  } catch (err) {
    error = err;
  }
  if (!error) {
    throw new Error('no error was caught');
  }
}

function testParseJsonInvalidSchema() {
  const obj = {
    nested: {
      str: 'str',
      num: 1234,
      bool: true
    },
    array: [
      'one',
      'two'
    ]
  };
  const schema = {
    nested: {
      str: 'string',
      num: 'number',
      bool: 'boolean'
    },
    array: ['string', 'secondvalue']
  };

  let error = null;
  try {
    pismoutil.parseJson(JSON.stringify(obj), schema);
  } catch (err) {
    error = err;
  }
  if (!error) {
    throw new Error('no error was caught');
  }
}