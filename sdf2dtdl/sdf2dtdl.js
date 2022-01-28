/**
 * DTDL to One Data Model SDF converter
 * @author Petri Laari
 * @author Ari Keränen
 */

const fs = require("fs");
const debug = require("debug")("sdf2dtdl");
/**
 * Mapping of SDF units to DTDL units
 * See https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/
 *     dtdlv2.md#semantic-types
 * and https://www.iana.org/assignments/senml/senml.xhtml
 */
const UNIT_MAP = require("./sdf-dtdl-unitmap.json");

/* How to convert Object/Thing names into DTDL ID compatible names
  (only letters, digits, or underscores) */
const NAMEFIX_RE = new RegExp("[\\W]", "g");
const NAMEFIX_CHAR = "_";

exports.createDTDL = createDTDL;

const DTDL_DEF_CONTEXT = "dtmi:dtdl:context;2";
const DTDL_DEF_ID_PREFIX = "dtmi:org:onedm:playground:";
const DTDL_DEF_VERSION = "1";
const DTDL_DEF_TYPE = "Interface";
const DTDL_MAX_DESC_LEN = 511;

/* map of SDF types to DTDL schema types */
const SDF_TYPE_TO_DTDL_SCHEMA = {
  "boolean": "boolean",
  "number": "double",
  "integer": "integer",
  "string": "string",
};

/* map of SDF string formats to DTDL schema types */
const SDF_FORMAT_TO_DTDL_SCHEMA = {
  "date-time": "dateTime",
  "time" : "time",
  "date" : "date"
}


if (require.main === module) {
  /* run as stand-alone? */
  try {
    if (process.argv.length == 3) {
      var inFile = process.argv[2];
      if (inFile === "-") {
        /* input from stdin */
        process.stdin.on('data', data => {
          let dtdl = createDTDL(JSON.parse(data));
          console.log(JSON.stringify(dtdl, null, 2));
        });
      } else {
        /* input from file */
        let data = fs.readFileSync(inFile, { encoding: "utf-8" });
        let dtdl = createDTDL(JSON.parse(data));
        console.log(JSON.stringify(dtdl, null, 2));
      }
    } else if (process.argv.length > 3) {
      /* set of files as parameter */
      let dtdlSet = [];
      process.argv.slice(2).forEach((inFile) => {
        data = fs.readFileSync(inFile, { encoding: "utf-8" });
        createDTDL(JSON.parse(data), dtdlSet);
      });
      console.log(JSON.stringify(dtdlSet, null, 2));
    }
  } catch (err) {
    console.error("Can't convert. " + err);
  }
}

function createDTDL(sdf, dtdlSet) {
  if (!dtdlSet) {
    dtdlSet = [];
  }

  if (sdf.sdfObject) {
    Object.getOwnPropertyNames(sdf.sdfObject).forEach((sdfObjName) => {
      let sdfObj = sdf.sdfObject[sdfObjName];
      let dtdl = makeDTDLheader("sdfobject", sdfObjName, sdfObj);
      let cont = (dtdl.contents = []);

      addSdfObjectContents(sdfObj, cont);
      dtdlSet.push(dtdl);
    });
  }
  if (sdf.sdfThing) {
    Object.getOwnPropertyNames(sdf.sdfThing).forEach((sdfThingName) => {
      let sdfThing = sdf.sdfThing[sdfThingName];
      let dtdl = makeDTDLheader("sdfthing", sdfThingName, sdfThing);
      let cont = (dtdl.contents = []);

      if (sdfThing.sdfObject) {
        /* add pointers to all Thing's Objects as Components */
        Object.getOwnPropertyNames(sdfThing.sdfObject).forEach((objName) => {
          cont.push(makeDtdlComponent('sdfobject', objName));
        });
      }
      if (sdfThing.sdfThing) {
        /* add pointers to all Thing's Things as Components */
        Object.getOwnPropertyNames(sdfThing.sdfThing).forEach((thingName) => {
          cont.push(makeDtdlComponent('sdfthing', thingName));
          /* recursively handle Thing's Things */
          createDTDL(sdfThing.sdfThing[thingName]);
        });
      }
      dtdlSet.push(dtdl);
      /* recursively handle Thing's Objects */
      createDTDL(sdfThing, dtdlSet);

    });
  }

  return dtdlSet;
}

function makeDtdlComponent(sdfType, name) {
  return {
    "@type": "Component",
    "name": name,
    "schema": DTDL_DEF_ID_PREFIX + sdfType + ":" +
      name.replace(NAMEFIX_RE, NAMEFIX_CHAR) + ";" + DTDL_DEF_VERSION
  }
}


function makeDTDLheader(type, sdfName, sdfDef) {
  let dtdlId = DTDL_DEF_ID_PREFIX + type + ":";
  let dtdl = {
    "@context": DTDL_DEF_CONTEXT,
    "@type": DTDL_DEF_TYPE,
  };
  dtdlId += sdfName.replace(NAMEFIX_RE, NAMEFIX_CHAR) + ";" + DTDL_DEF_VERSION;
  dtdl["@id"] = dtdlId;
  dtdl["displayName"] = sdfDef.label ? sdfDef.label : sdfName;

  if (sdfDef.description) {
    dtdl["description"] = sdfDef.description.substring(0, DTDL_MAX_DESC_LEN);
  }
  return dtdl;
}


function addSdfObjectContents(sdfObject, cont) {
  if (sdfObject.sdfProperty) {
    Object.getOwnPropertyNames(sdfObject.sdfProperty).forEach((propName) => {
      cont.push(
        makeDtdlContent(sdfObject.sdfProperty[propName], propName, "Property")
      );
    });
  }
  if (sdfObject.sdfAction) {
    Object.getOwnPropertyNames(sdfObject.sdfAction).forEach((actName) => {
      let sdfAct = sdfObject.sdfAction[actName];
      let dtdlCom = makeDtdlContent(sdfAct, actName, "Command");
      /* TODO: request details from sdfInputData;
      see https://ietf-wg-asdf.github.io/SDF/sdf.html#section-5.3 */
      cont.push(dtdlCom);
    });
  }
  if (sdfObject.sdfEvent) {
    Object.getOwnPropertyNames(sdfObject.sdfEvent).forEach((eventName) => {
      /* TODO: output data details */
      cont.push(
        makeDtdlContent(sdfObject.sdfEvent[eventName], eventName, "Telemetry")
      );
    });
  }
}

/**
 * Makes new DTDL content object from the given SDF affordance
 * (Action/Event/Property)
 * @param {*} sdfAff Source SDF affordance
 * @param {*} affName SDF affordance name
 * @param {*} dtdlType DTDL type ("Command", "Telemetry", etc.)
 * @returns The new DTDL content object
 */
function makeDtdlContent(sdfAff, affName, dtdlType) {
  let cont = {};
  
  if (UNIT_MAP[sdfAff.unit] &&
      UNIT_MAP[sdfAff.unit][0].type) {
        /* DTDL semantic type */
        cont["@type"] = [dtdlType, UNIT_MAP[sdfAff.unit][0].type];
  } else {
    cont["@type"] = dtdlType;
  }

  cont.name = affName.replace(NAMEFIX_RE, NAMEFIX_CHAR);
  xlate(cont, "description", sdfAff.description, x => {
      return x.substring(0, DTDL_MAX_DESC_LEN)
    });
  if (sdfAff.format) {
    let dtdlSchema = SDF_FORMAT_TO_DTDL_SCHEMA[sdfAff.format];
    if (! dtdlSchema) {
      /* SDF string formats not in DTDL types become string */
      cont.schema = "string";
    } else {
      cont.schema = dtdlSchema;
    }
  } else {
    xlate(cont, "schema", sdfAff.type,
      (x) => {
        if (x == "array") {
          /* TODO: array details are lost for Property type, but
             complex schemas are not allowed for Property */
          if (dtdlType == "Property") {
            return SDF_TYPE_TO_DTDL_SCHEMA[sdfAff.items.type];
          }
          else return {
            "@type": "Array",
            "elementSchema": SDF_TYPE_TO_DTDL_SCHEMA[sdfAff.items.type]
          }
        } else {
          return SDF_TYPE_TO_DTDL_SCHEMA[x]
        }
      });
  }

  if (sdfAff.enum) {
    let contEnum = {};
    contEnum['@type'] = "Enum";
    /* Enum can be only string in SDF */
    contEnum.valueSchema = SDF_TYPE_TO_DTDL_SCHEMA[sdfAff.type];
    let enumValues = [];
    sdfAff.enum.forEach((eType) => {
      let tmpItem = {};
      tmpItem.name = eType; 
      tmpItem.enumvalue = eType;
      enumValues.push(tmpItem);
    });
    contEnum.enumValues = enumValues;
    cont.schema = contEnum;
  }

  if (sdfAff.sdfChoice) {
    let contEnum = {};
    contEnum['@type'] = "Enum";
    /* Enum in DTDL can only be integer or string */
    if(sdfAff.type != "string" && sdfAff.type != "integer") {
      console.log("ERROR: ENUM type in DTDL can be only String or Integer.", 
                  "SDF has now ", sdfAff.type);
      process.exit();
    }
    contEnum.valueSchema = SDF_TYPE_TO_DTDL_SCHEMA[sdfAff.type];
    let enumValues = [];
    Object.entries(sdfAff.sdfChoice).forEach((cItem) => {
      let tmpItem = {};
      tmpItem.name = cItem[0];
      if(cItem[1].description) {
        tmpItem.description = cItem[1].description;
      }
      tmpItem.enumValue = cItem[0];
      enumValues.push(tmpItem);
    });
    contEnum.enumValues = enumValues;
    cont.schema = contEnum;
  }

  if(sdfAff.type == 'object') {
    let schema = {};
    let fields = [];
    schema['@type'] = "Object";
    Object.entries(sdfAff.properties).forEach ( res => {
      /* Support for other than schema to be added */
      let tmpItem={};
      let sdfFields = res[1];
      tmpItem = {"name": res[0]};
      if (sdfFields.description) {
        tmpItem.description = sdfFields.description;
      }
      if (sdfFields.type) { 
        tmpItem.schema = SDF_TYPE_TO_DTDL_SCHEMA[sdfFields.type];
      }
      fields.push(tmpItem);
    });
    schema.fields = fields; 
    cont.schema = schema;
  }

  xlate(cont, "unit", sdfAff.unit, (x) => {
    return UNIT_MAP[x] ? UNIT_MAP[x][0].unit : undefined;
  });

  /* writable defaults to 'true' in SDF and 'false' in DTDL */
  if (dtdlType === "Property" &&
    (sdfAff.writable === undefined || sdfAff.writable === true)) {
    cont.writable = true;
  }
  return cont;
}

/**
 * Conditionally adds a translated value to an object.
 * @param {*} dstObj The object where to add the value as new member
 * @param {*} dstField The name of the new member
 * @param {*} value The value to add. If value is undefined, nothing is
 * added
 * @param {*} trans Translation function. If given as parameter, this is
 * used to translate the given value into a new value before storing as
 * a new member (unless the result is undefined)
 */
function xlate(dstObj, dstField, value, trans) {
  if (value != undefined) {
    if (trans) {
      if (trans(value) != undefined) {
        dstObj[dstField] = trans(value);
      } else {
        debug("Can't translate " + value + " for field " + dstField);
      }
    }
    else {
      dstObj[dstField] = value;
    }
  }
}