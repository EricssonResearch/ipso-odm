/** 
 * ODM Data model linter
 * @author Ari Keränen
 */

const fs = require('fs');
const ajv = require('ajv')();

const DEF_SCHEMA_FILE = 'sdf-alt-schema.json';

let schema;
let odmFile;

if (process.argv.length > 2) { /* file as command line parameter */
  var inFile = process.argv[2];
  var schemaFile = process.argv.length > 3 ? process.argv[3] : DEF_SCHEMA_FILE;
  var validate;

  try {
    odmFile = JSON.parse(fs.readFileSync(inFile, { encoding: 'utf-8' }));
    schema = JSON.parse(fs.readFileSync(schemaFile, { encoding: 'utf-8' }));
    validate = ajv.compile(schema);
  } catch (err) {
    console.log(err.message);
    process.exit(-1);
  }

  if (!validate(odmFile)) {
    console.dir(validate.errors);
    process.exit(-1);
  } else {
    console.log(inFile + " matches schema " + schemaFile);
  }
}
else {
  console.log("Usage: node odmlint.js odmfile.json [schemafile.json]");
}
