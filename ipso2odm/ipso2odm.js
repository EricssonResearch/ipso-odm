/**
 * IPSO model to One Data Model SDF converter
 * @author Ari Keränen
 */

const fs = require('fs');
const xmldoc = require('xmldoc');
const debug = require('debug')('ipso2odm');

const TITLE_PREFIX = "OMA LwM2M";
const VERSION = "20191025";
const LWM2M_ODM_NS = "http://example.com/lwm2m/odm";
const LWM2M_NS_PREFIX = "lwm2m";

const ODM_FILE_PREFIX = "odmobject-";
const ODM_FILE_SUFFIX = ".sdf.json";

/* How to convert Object names into ODM compatible names */
const NAMEFIX_RE = new RegExp('[\\s,\\/]', "g");
const NAMEFIX_CHAR = "_";

/* default values if can't parse from input file */
const DEF_COPYRIGHT = "Copyright (c) 2018, 2019 IPSO";
const DEF_LICENSE =
  "https://github.com/one-data-model/oneDM/blob/master/LICENSE";

/* try to read copy right and license from file? */
const LICENSE_FROM_FILE = false;
const COPYR_FROM_FILE = false;

/* use IPSO/LWM2M (true) or ODM default (false) namespace */
const USE_LWM2M_NS = false;

exports.createOdm = createOdm;

if (require.main === module) { /* run as stand-alone? */
  if (process.argv.length == 3) { /* file as command line parameter */
    var inFile = process.argv[2];
    fs.readFile(inFile, {encoding: 'utf-8'}, function(err, data) {
      try {
        let odm = createOdm(data);
        console.log(JSON.stringify(odm, null, 2));
      } catch (err) {
        console.log("Can't convert. " + err);
      }
    });
  }
  else if (process.argv.length > 3) { /* set of files as parameter */
  process.argv.slice(2).forEach (inFile => {
    fs.readFile(inFile, {encoding: 'utf-8'}, function(err, data) {
      try {
        let odm = createOdm(data);
        let objname = Object.getOwnPropertyNames(odm.odmObject)[0].
          toLocaleLowerCase();
        let outFile = ODM_FILE_PREFIX + objname + ODM_FILE_SUFFIX;
        debug("Outfile: " + outFile);
        fs.writeFile(outFile, JSON.stringify(odm, null, 2), err => {
          if (err) {
            console.error(err);
            return;
          }
        });
      } catch (err) {
        console.log("Can't convert. " + err);
      }
      });
    });
  }
}

/**
 * Creates ODM document based on the given LwM2M object schema document
 * @param data The LwM2M object schema document as UTF-8
 * @returns ODM document as JSON object
 */
function createOdm(data) {
  let doc = new xmldoc.XmlDocument(data);
  let odm = {};
  let obj = doc.childNamed("Object");
  let odmObj = {};
  let objName = obj.childNamed("Name").val;
  /* use underscores for spaces in JSON names */
  let objJSONName = objName.replace(NAMEFIX_RE, NAMEFIX_CHAR);
  let odmProplist;
  let copyRight = DEF_COPYRIGHT;
  let license = DEF_LICENSE;

  /* hacky way to extract copyright and license info from XML comment */
  let copyStart = data.indexOf("\nCopyright");
  let copyEnd = data.indexOf('\n', copyStart + 1);
  if (copyStart > 1) { /* Found copyright line */
    if (COPYR_FROM_FILE) {
      copyRight = data.substring(copyStart, copyEnd).trim();
    }
    if (LICENSE_FROM_FILE) {
      license = data.substring(copyEnd, data.indexOf("-->")).trim();
    }
  }

  odm.info = {
    "title":  TITLE_PREFIX + " " + obj.childNamed("Name").val +
      " (Object ID " + obj.childNamed("ObjectID").val + ")" ,
    "version": VERSION,
    "copyright": copyRight,
    "license": license
  }

  if (USE_LWM2M_NS) {
    odm.namespace = {};
    odm.namespace[LWM2M_NS_PREFIX] = LWM2M_ODM_NS;
    odm.defaultNamespace = LWM2M_NS_PREFIX;
  }

  odmObj[objJSONName] = {
    "name" : objName,
    "description" : obj.childNamed("Description1").val.trim(),
    "odmProperty" : {}
  };

  odm.odmObject = odmObj;

  odmProplist = odmObj[objJSONName].odmProperty = {};
  odmActlist = odmObj[objJSONName].odmAction = {};
  reqList = odmObj[objJSONName].odmRequired = [];

  obj.childNamed("Resources").children.forEach(res => {
    if (res.type === "text") {
      return;
    }

    let name = res.childNamed("Name").val;
    let JSONName = name.replace(NAMEFIX_RE, NAMEFIX_CHAR);
    let isAction = res.childNamed("Operations").val.includes("E");
    let list = isAction ? odmActlist : odmProplist;

    let odmItem = list[JSONName] = {
      "name": name,
      "description": res.childNamed("Description").val.trim(),
    }

    if (!isOptional(res)) {
      reqList.push(isAction ? "0/odmAction/" : "0/odmProperty/" +
        JSONName);
    }

    if (!isAction) {
      let opers = res.childNamed("Operations").val;
      if (!opers.includes("R")) {
        odmItem.readable = false;
      }
      if (!opers.includes("W")) {
        odmItem.writeable = false;
      }
      addResourceType(odmItem, res);
      addResourceDetails(odmItem, res);
    }
  });

  return odm;
};

/**
 * Returns true if the given LwM2M schema element has a child element
 * 'Mandatory' with value 'optional' (non-case-sensitive)
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function isOptional(lwm2mElement) {
  return lwm2mElement.childNamed("Mandatory").
    val.toLowerCase().trim() === "optional";
}

/**
 * Adds "type" and/or "subtype" ODM element(s) to the given ODM 
 * Property element based on type information in the given 
 * LwM2M schema element.
 * @param {Object} odmProp The ODM property element
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function addResourceType(odmProp, lwm2mElement) {
  let lwType = lwm2mElement.childNamed("Type").val.toLowerCase();
  let type;
  let subtype;

  switch (lwType) {
    case "string":
    case "boolean":
    case "integer":
      /* string, boolean, and integer are valid as such */
      type = lwType;
      break;
    case "float":
      type = "number";
      break;
    case "unsigned integer":
      type = "integer";
      odmProp.minimum = 0;
      break;
    case "opaque":
      subtype = "bytestring";
      break;
    case "time":
      subtype = "unixtime";
      break;
    default:
      /* type not (yet) supported; TODO: CoreLnk as odmType */
      type = "unknown (" + lwType + ")";
  }

  if (lwm2mElement.childNamed("MultipleInstances").val === "Multiple") {
    /* convert multi-instance resources to ODM array values */
    odmProp.type = "array";
    odmProp.items = {};
    if (type) {
      odmProp.items.type = type;
    }
    if (subtype) {
      odmProp.items.subtype = subtype;
    }
  } else {
    if (type) {
      odmProp.type = type;
    }
    if (subtype) {
      odmProp.subtype = subtype;
    }
  }

}

/**
 * Adds "minimum", "maximum", and "unit" ODM element(s) to the given ODM
 * Property element based on information in the given LwM2M schema element.
 * @param {Object} odmProp The ODM property element
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function addResourceDetails(odmProp, lwm2mElement) {
  let lwUnit = lwm2mElement.valueWithPath("Units");
  let lwRange = lwm2mElement.valueWithPath("RangeEnumeration");

  if (lwUnit) {
    odmProp.units = lwUnit;
  }

  if (lwRange) {
    if (lwRange.includes("..")) {
      let limits = lwRange.split("..");
      odmProp.minimum = JSON.parse(limits[0]);
      odmProp.maximum = JSON.parse(limits[1]);
    }
    /* TODO: handle other range types */
  }

}