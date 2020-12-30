/**
 * IPSO model to One Data Model SDF converter
 * @author Ari Keränen
 */

const fs = require('fs');
const xmldoc = require('xmldoc');
const debug = require('debug')('ipso2odm');

const TITLE_PREFIX = "OMA LwM2M";
const VERSION = "2020-12-30";
const LWM2M_ODM_NS = "http://example.com/lwm2m/odm";
const LWM2M_NS_PREFIX = "lwm2m";

const ODM_FILE_PREFIX = "sdfobject-";
const ODM_FILE_SUFFIX = ".sdf.json";

/* How to convert Object names into ODM compatible names */
const NAMEFIX_RE = new RegExp('[\\s,\\/]', "g");
const NAMEFIX_CHAR = "_";

/* default values if can't parse from input file */
const DEF_COPYRIGHT = "Copyright (c) 2018-2020 IPSO";
const DEF_LICENSE =
  "https://github.com/one-data-model/oneDM/blob/master/LICENSE";

/* range of LwM2M/IPSO re-usable resource IDs */
const RE_RES_MIN = 2048
const RE_RES_MAX = 26240

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
        let objname = Object.getOwnPropertyNames(odm.sdfObject)[0].
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
 * Creates SDF OneDM object document based on the given LwM2M object
 * schema document
 * @param data The LwM2M object schema document as UTF-8
 * @returns SDF document as JSON object
 */
function createOdm(data, copyrFromFile, licenseFromFile,
    reusableResRefs) {
  let doc = new xmldoc.XmlDocument(data);
  let odm = {};
  let xmlObj = doc.childNamed("Object");
  let sdfObj = {};
  let objName = xmlObj.childNamed("Name").val;
  /* use underscores for spaces in JSON names */
  let objJSONName = objName.replace(NAMEFIX_RE, NAMEFIX_CHAR);
  let copyRight = DEF_COPYRIGHT;
  let license = DEF_LICENSE;

  /* hacky way to extract copyright and license info from XML comment */
  let copyStart = data.indexOf("\nCopyright");
  let copyEnd = data.indexOf('\n', copyStart + 1);
  if (copyStart > 1) { /* Found copyright line */
    /* try to read copy right and license from file? */
    if (copyrFromFile) {
      copyRight = data.substring(copyStart, copyEnd).trim();
    }
    if (licenseFromFile) {
      license = data.substring(copyEnd, data.indexOf("-->")).trim();
    }
  }

  odm.info = {
    "title":  TITLE_PREFIX + " " + xmlObj.childNamed("Name").val +
      " (Object ID " + xmlObj.childNamed("ObjectID").val + ")" ,
    "version": VERSION,
    "copyright": copyRight,
    "license": license
  }

  if (USE_LWM2M_NS) {
    odm.namespace = {};
    odm.namespace[LWM2M_NS_PREFIX] = LWM2M_ODM_NS;
    odm.defaultNamespace = LWM2M_NS_PREFIX;
  }

  sdfObj[objJSONName] = {
    "label" : objName,
    "description" : xmlObj.childNamed("Description1").val.trim(),
  };

  odm.sdfObject = sdfObj;

  addResources(xmlObj, odm, objJSONName, reusableResRefs);

  return odm;
};

/**
 * Adds resources from the XML object to the SDF object
 * @param xmlObj The LwM2M XML object where to get resource info
 * @param odm The OneDM SDF document where to store resource info
 * @param objJSONName The JSON formatted name of the object
 * @param reusableResRefs IPSO re-usable resources using references
 *  (not inlined)
 */
function addResources(xmlObj, odm, objJSONName, reusableResRefs) {
  let sdfObj = odm.sdfObject[objJSONName];
  let objJsonPathRoot = "#/sdfObject/" + objJSONName + "/";
  let objProplist = sdfObj.sdfProperty = {};
  let objActlist = sdfObj.sdfAction = {};
  let reqList = sdfObj.sdfRequired = [];
  let odmProplist;
  let odmActlist;

  if (reusableResRefs) {
    odmProplist = odm.sdfProperty = {};
    odmActlist = odm.sdfAction = {};
  }

  xmlObj.childNamed("Resources").children.forEach(res => {
    if (res.type === "text") {
      return;
    }

    let name = res.childNamed("Name").val;
    let JSONName = name.replace(NAMEFIX_RE, NAMEFIX_CHAR);
    let isAction = res.childNamed("Operations").val.includes("E");
    let list = isAction ? objActlist : objProplist;

    if (reusableResRefs &&
        res.attr.ID >= RE_RES_MIN && res.attr.ID <= RE_RES_MAX) {
      /* for re-usable resources add pointer and further details to
        the top-level props/actions */
      list[JSONName] = {
        "sdfRef" : objJsonPathRoot +
          (isAction ? "sdfAction/" : "sdfProperty/") + JSONName
      }
      list = isAction ? odmActlist : odmProplist;
    }

    let odmItem = list[JSONName] = {
      "label": name,
      "description": res.childNamed("Description").val.trim(),
    }

    if (!isOptional(res)) {
      reqList.push(objJsonPathRoot +
        (isAction ? "sdfAction/" : "sdfProperty/" + JSONName));
    }

    if (!isAction) {
      let opers = res.childNamed("Operations").val;
      if (!opers.includes("R")) {
        odmItem.readable = false;
      }
      if (!opers.includes("W")) {
        odmItem.writable = false;
      }
      addResourceType(odmItem, res);
      addResourceDetails(odmItem, res);
    }
  });
}


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
 * Adds "type" and/or "subtype" SDF element(s) to the given SDF
 * Property element based on type information in the given
 * LwM2M schema element.
 * @param {Object} sdfProp The SDF property element
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function addResourceType(sdfProp, lwm2mElement) {
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
      sdfProp.minimum = 0;
      break;
    case "opaque":
      subtype = "byte-string";
      break;
    case "time":
      subtype = "unix-time";
      break;
    default:
      /* type not (yet) supported; TODO: CoreLnk as odmType */
      type = "unknown (" + lwType + ")";
  }

  if (lwm2mElement.childNamed("MultipleInstances").val === "Multiple") {
    /* convert multi-instance resources to ODM array values */
    sdfProp.type = "array";
    sdfProp.items = {};
    if (type) {
      sdfProp.items.type = type;
    }
    if (subtype) {
      sdfProp.items.subtype = subtype;
    }
  } else {
    if (type) {
      sdfProp.type = type;
    }
    if (subtype) {
      sdfProp.subtype = subtype;
    }
  }

}

/**
 * Adds "minimum", "maximum", and "unit" SDF element(s) to the given SDF
 * Property element based on information in the given LwM2M schema element.
 * @param {Object} sdfProp The ODM property element
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function addResourceDetails(sdfProp, lwm2mElement) {
  let lwUnit = lwm2mElement.valueWithPath("Units");
  let lwRange = lwm2mElement.valueWithPath("RangeEnumeration");

  if (lwUnit) {
    sdfProp.unit = lwUnit;
  }

  if (lwRange) {
    if (lwRange.includes("..")) {
      let limits = lwRange.split("..");
      sdfProp.minimum = JSON.parse(limits[0]);
      sdfProp.maximum = JSON.parse(limits[1]);
    }
    /* TODO: handle other range types */
  }

}