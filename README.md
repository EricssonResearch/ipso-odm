# IPSO to OneDM translation

Automated translation of [IPSO/LwM2M models](http://www.openmobilealliance.org/wp/OMNA/LwM2M/LwM2MRegistry.html) to [One Data Model SDF](https://github.com/one-data-model/language/blob/master/sdf.md).

## Installing

* Install [nodejs](https://nodejs.org/en/)
* Clone this repo
* run `npm install` to install dependencies

## Usage

`node ipso2odm.js [file-name]`

## Example

`node ipso2odm.js samples/load.xml`

## Web service mode

If no file name is given, the program is started in web service mode, accepting HTTP POSTs to `/ipso2odm` with XML schema files in payload.

The HTTP port where the program is accepting requests can be defined with the `PORT` environment variable. By default port 8083 is used.

The program is picky with EOL characters so the XML schema files should be sent "as-is". For example:

`curl --data-binary "@3308.xml" http://localhost:8083/ipso2odm`

## Debugging

Debugging prints can be enabled by adding `ipso2odm` to `DEBUG` environment variable. For example:

`DEBUG=ipso2odm node ipso2odm.js samples/load.xml`

## ODM linter

The odmlint.js program can check if the given ODM SDF file matches to the SDF schema. By default the [sdf-alt-schema.json](sdf-alt-schema.json) is used but other schema file (e.g., [sdf-schema.json](https://github.com/one-data-model/language/blob/master/sdf-schema.json)) can be given as a second parameter.

Usage: `node odmlint.js odmfile.json [schemafile.json]`

Example: `node odmlint.js samples/bitmap.json`

If the given ODM SDF file doesn't match the schema, error(s) are described as defined here: https://github.com/epoberezkin/ajv#error-objects