# IPSO - OneDM data model translation toolkit

Toolkit for automated translation between [IPSO/LwM2M models](http://www.openmobilealliance.org/wp/OMNA/LwM2M/LwM2MRegistry.html) and [One Data Model SDF](https://github.com/one-data-model/language/blob/master/sdf.md).

## Installing

* Install [nodejs](https://nodejs.org/en/)
* Clone this repo
* run `npm install` to install dependencies

## IPSO to OneDM SDF converter

Usage: `node ipso2odm [file-name(s)]`

When only a single file name is given, the resulting SDF is printed to the screen (stdout).

When multiple file names are given, the output of each conversion is saved to `odmobject-object_name-sdf.json` file where `object_name` is the object name from each schema file.

### Examples

`node ipso2odm samples/load.xml`

`node ipso2odm samples/*.xml`

## OneDM SDF to IPSO converter

Usage: `node odm2ipso [file-name]`

Translates the given OneDM SDF file to a LwM2M schema file. The program also uses as input `idmap.json` to give known IPSO objects and resources the correct IDs. The file can be generated/updated using the `ipsoidmapper` program.

## SDF linter

The linter is now available at the [OneDM tools repository](https://github.com/one-data-model/tools).

## IPSO ID mapper

The ipsoidmapper.js can generate a protocol binding ID mapping file out of a set of IPSO/LwM2M schema files.

Usage: `node ipsoidmapper [file-name(s)]`

Example: `node ipsoidmapper samples/*.xml`

## Web service mode

The ipso2odm, odm2ipso, and odmlint programs can also run in a web service mode with `ipso-odm-ws`. The web service mode is not installed by default but can be installed with:

`npm install ipso-odm-ws`

and run with:

`node ipso-odm-ws`

In this mode an HTTP server is started that accepts POSTs to `/ipso2odm` with IPSO/LwM2M XML schema files in payload, POSTs to `/odm2ipso` with OneDM SDF files in payload, and POSTs to `/odmlint` with SDF files in payload. If the payload is well-formed, the server returns the JSON output of ipso2odm or odmlint respectively, or a LwM2M schema file for odm2ipso.

The HTTP port where the server is accepting requests can be defined with the `PORT` environment variable. By default port 8083 is used.

The program is picky with EOL characters so the XML schema files should be sent "as-is". For example:

`curl --data-binary "@samples/load.xml" http://localhost:8083/ipso2odm`

## Debugging

Debugging prints can be enabled by adding `ipso2odm` or `ipso-odm-ws` to `DEBUG` environment variable. For example:

`DEBUG=ipso2odm node ipso2odm samples/load.xml`
