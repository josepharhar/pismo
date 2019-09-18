import * as pismoutil from './pismoutil.js';

function it(name, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`test "${name}" failed`);
    throw error;
  }
}

it("testParseJsonValid", () => {
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

  pismoutil.parseJson(obj, schema);
});

it("testParseJsonInvalid", () => {
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
    pismoutil.parseJson(obj, schema);
  } catch (err) {
    error = err;
  }
  if (!error) {
    throw new Error('no error was caught');
  }
});

it("testParseJsonInvalidSchema", () => {
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
    pismoutil.parseJson(obj, schema);
  } catch (err) {
    error = err;
  }
  if (!error) {
    throw new Error('no error was caught');
  }
});