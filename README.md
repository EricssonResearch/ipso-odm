# OMA - SDF data model translation toolkit

Toolkit for automated translation between OMA [LwM2M models](https://www.openmobilealliance.org/specifications/registries/objects) and Semantic Definition Format [RFC 9880](https://www.rfc-editor.org/rfc/rfc9880.html).

## Installing

* Install [nodejs](https://nodejs.org/en/)
* Clone this repo
* run `npm install` to install dependencies

## OMA to SDF converter

Usage: `node oma2sdf [file-name(s)]`

When only a single file name is given, the resulting SDF is printed to the screen (stdout).

When multiple file names are given, the output of each conversion is saved to `sdfobject-object_name-sdf.json` file where `object_name` is the object name from each schema file.

### Examples

`node oma2sdf samples/load.xml`

`node oma2sdf samples/*.xml`

## SDF to OMA converter

Usage: `node sdf2oma [file-name]`

Translates the given SDF file to a LwM2M schema file. The program also uses as input `idmap.json` to give known OMA objects and resources the correct IDs. The file can be generated/updated using the `omaidmapper` program.

## SDF linter

The linter is now available at the [OneDM tools repository](https://github.com/one-data-model/tools).

## OMA ID mapper

The omaidmapper.js can generate a protocol binding ID mapping file out of a set of OMA/LwM2M schema files.

Usage: `node omaidmapper [file-name(s)]`

Example: `node omaidmapper samples/*.xml`

## Web service mode

The oma2sdf, sdf2oma, and sdflint programs can also run in a web service mode with `oma-sdf-ws`. The web service mode is not installed by default but can be installed with:

`npm install oma-sdf-ws`

If sdflint functionality is needed, the sdflint submodule needs to be initiated:
`git submodule update --init`

And dependencies for the sdflint installed:
`cd onedm-tools/sdflint && npm install`


The web service mode is run with:

`node oma-sdf-ws`

In this mode an HTTP server is started that accepts POSTs to `/oma2sdf` with OMA/LwM2M XML schema files in payload, POSTs to `/sdf2oma` with SDF files in payload, and POSTs to `/sdflint` with SDF files in payload. If the payload is well-formed, the server returns the JSON output of oma2sdf or sdflint respectively, or a LwM2M schema file for sdf2oma.

The HTTP port where the server is accepting requests can be defined with the `PORT` environment variable. By default port 8083 is used.

The program is picky with EOL characters so the XML schema files should be sent "as-is". For example:

`curl --data-binary "@samples/load.xml" http://localhost:8083/oma2sdf`

## Debugging

Debugging prints can be enabled by adding `oma2sdf` or `oma-sdf-ws` to `DEBUG` environment variable. For example:

`DEBUG=oma2sdf node oma2sdf samples/load.xml`

## Create an sdfThing

The create-sdfthing.js is a simple tool that creates an sdfThing, comprising of information in the skeleton json file containing the meta-information of the thing (e.g. info, namespace, and defaultNamespace) and the given SDF objects. If the parameter "-f <base for filename>" is not given, the created sdfThing is written to stdout.

Usage: `node create-sdfthing.js [-f <base for filename>] [skeleton file] [list of sdf-object files]`

Example: `node create-sdfthing.js -f TempPres temperature_pressure_sensor.json sdfobject-temperature.sdf.json sdfobject-pressure.sdf.json`

This example creates a file sdfthing-TempPres.sdf.json using the temperature_pressure_sensor.json file as the base for the thing and merging the temperature and pressure objects into the thing.
