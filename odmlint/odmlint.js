/** 
 * ODM Data model linter
 * @author Ari Keränen
 */

const fs = require('fs');
const Ajv = require('ajv');
const path = require('path');

const AJV_OPTIONS = {
  "allErrors": true,
  "format": "full"
}

/* Regular expression for valid SDF file names */
const FILENAME_RE = '^odm(object|thing|data)-[a-z0-9_.-]*\.sdf\.json$';
/* Regular expression for valid characters in SDF file */
const VALID_CHARS_RE = '[^\x00-\x7F]';

const DEF_SCHEMA_FILE = 'sdf-alt-schema.json';

exports.odmLint = odmLint;

if (require.main === module) { /* run as stand-alone? */
  let res = {
    errorCount: 0,
    errors: {}
  };

  if (process.argv.length > 2) { /* file as command line parameter */
    let schema;
    let odmFile;
    let inFile = process.argv[2];
    let appDir = path.dirname(require.main.filename);

    let schemaFile = process.argv.length > 3 ?
     process.argv[3] : (appDir + "/../" + DEF_SCHEMA_FILE);

    fileNameCheck(inFile, res);

    try {
      odmFile = JSON.parse(fs.readFileSync(inFile,
        { encoding: 'utf-8' }));
      schema = JSON.parse(fs.readFileSync(schemaFile,
        { encoding: 'utf-8' }));
      odmLint(odmFile, schema, res);
    } catch (err) {
      res.errorCount = 1;
      res.errors.parse = err.message;
    }

    console.dir(res, {depth: null});

    process.exit(res.errorCount);
  }
  else {
    console.log("Usage: node odmlint odmfile.json [schemafile.json]");
  }
}


function fileNameCheck(fileName, res) {
  let fileNameRe = new RegExp(FILENAME_RE);
  let baseFileName = path.parse(fileName).base;

  if (! baseFileName.match(fileNameRe)) {
    res.errorCount++;
    res.errors.fileName = "File name " + baseFileName +
      " does not match " + FILENAME_RE;
  }
}


function validCharsCheck(odmFile, res) {
  let odmStr = JSON.stringify(odmFile);
  let invalidLoc = odmStr.search(new RegExp(VALID_CHARS_RE));
  if (invalidLoc != -1) {
    res.errorCount++;
    res.errors.validChars = "File contains unexpected character:" +
      odmStr.charAt(invalidLoc);
  }
}


function odmLint(odmFile, schema, res) {
  let ajv = new Ajv(AJV_OPTIONS);

  validCharsCheck(odmFile, res);

  if (! schema) {
    schema = JSON.parse(fs.readFileSync(
      DEF_SCHEMA_FILE, { encoding: 'utf-8' }));
  }
  if (! res) {
    res = {
      errorCount: 0,
      errors: {}
    };
  }

  let validate = ajv.compile(schema);

  if (!validate(odmFile)) {
    res.errors.schema = validate.errors;
    res.errorCount++;
  }

  return res;
}
