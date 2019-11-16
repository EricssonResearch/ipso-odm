/** 
 * ODM Data model linter
 * @author Ari Keränen
 */

const fs = require('fs');
const ajv = require('ajv')();

const LINT_STATUS = {
  OK: 0,
  FAIL_SCHEMA: -1
}
exports.LINT_STATUS;

const DEF_SCHEMA_FILE = 'sdf-alt-schema.json';

exports.odmLint = odmLint;

if (require.main === module) { /* run as stand-alone? */
  if (process.argv.length > 2) { /* file as command line parameter */
    let schema;
    let odmFile;
    let inFile = process.argv[2];
    let schemaFile = process.argv.length > 3 ? process.argv[3] : DEF_SCHEMA_FILE;
    let res;

    try {
      odmFile = JSON.parse(fs.readFileSync(inFile, { encoding: 'utf-8' }));
      schema = JSON.parse(fs.readFileSync(schemaFile, { encoding: 'utf-8' }));
      res = odmLint(odmFile, schema);
    } catch (err) {
      console.log(err.message);
    }

    console.dir(res);
  }
  else {
    console.log("Usage: node odmlint odmfile.json [schemafile.json]");
  }
}


function odmLint(odmFile, schema) {
  if (! schema) {
    schema = JSON.parse(fs.readFileSync(DEF_SCHEMA_FILE, { encoding: 'utf-8' }));
  }

  let validate = ajv.compile(schema);

  res = {
    result: LINT_STATUS.OK,
    errors: []
  };

  if (!validate(odmFile)) {
    res.result = LINT_STATUS.FAIL_SCHEMA;
    res.errors = validate.errors;
  }

  return res;
}
