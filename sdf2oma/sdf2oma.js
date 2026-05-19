/**
 * SDF to OMA converter
 * @author Niklas Widell
 */

var fs = require('fs');
var xmlformatter = require('xml-formatter');
const debug = require('debug')('sdf2oma');
const { toXML } = require('jstoxml');
const NO_ESCAPE = { contentReplacements: false };

const VERSION = "1.0";
const OBJ_URN_BASE = 'urn:oma:lwm2m:ext:';
const PREAMPLE_PREFIX =
  '<?xml version="1.0" encoding="UTF-8"?>\n<!--\n'
const ID_MAP_FILE = "idmap.json";
const DEFAULT_OBJ_ID = 65535;
const OMA_ID_QUALITY = "oma:id";



/* convert name underscores to spaces (for ipso2sdf round trip) */
const NAMEFIX_RE = new RegExp('[_]', "g");
const NAMEFIX_CHAR = " ";

exports.getFormattedXml = getFormattedXml;

/* Initialize ID mapping from file (default idmap.json) */
let idmap = {
  map: {}
};

/* Reading ID map file */
try {
  data = fs.readFileSync(ID_MAP_FILE, { encoding: 'utf-8'});
  idmap = JSON.parse(data);
} catch (err) {
  console.error("Can't read " + ID_MAP_FILE +
    ". Generating missing IDs for objects and resources.");
}

if (require.main === module) { /* run as stand-alone? */
  if (process.argv.length == 3) {/* input file as cmd line parameter */
    var inFile = process.argv[2];
    fs.readFile(inFile, { encoding: 'utf-8' }, function (err, data) {
      try {
        let sdf = JSON.parse(data);
        console.log(getFormattedXml(sdf));
      } catch (err) {
        console.log("Can't convert. " + err);
      }
    });
  }
}

function getFormattedXml(sdf) {
  let ipsoinfo = translateSDFObject(sdf);
  let preamble = PREAMPLE_PREFIX + sdf.info.copyright + '\n' +
    sdf.info.license + '\n-->\n';
  let ipsofile = preamble + xmlformatter(ipsoinfo,
    { collapseContent: true });

  return ipsofile;
}

function translateSDFObject(sdf) {
  let objname = Object.keys(sdf.sdfObject)[0];
  let objid = DEFAULT_OBJ_ID;
  let sdfobject = sdf.sdfObject[objname];
  let ipsoinfo = {};


  if (OMA_ID_QUALITY in sdfobject) {
    objid = sdfobject[OMA_ID_QUALITY];
  }
  else if (idmap.map && idmap.map["#/sdfObject/" + objname]) {
    objid = idmap.map["#/sdfObject/" + objname].id;
  } else {
    debug("Using default object ID " + objid);
  }
  if (sdfobject.label) {
    ipsoinfo.Name = sdfobject.label;
  } else {
    ipsoinfo.Name = objname.replace(NAMEFIX_RE, NAMEFIX_CHAR);
  }

  if ('description' in sdfobject) {
    ipsoinfo.Description1 = sdfobject.description;
  }

  ipsoinfo.ObjectID = objid;
  ipsoinfo.ObjectURN = OBJ_URN_BASE + objid;
  ipsoinfo.LWM2MVersion = VERSION;
  ipsoinfo.ObjectVersion = VERSION;
  ipsoinfo.MultipleInstances = 'Multiple';
  ipsoinfo.Mandatory = 'Optional';
  ipsoinfo.Resources = toXML(translateResources(sdf, objname), NO_ESCAPE);
  ipsoinfo.Description2 = "";

  let mo = toXML({
    _name: 'Object',
    _content: toXML(ipsoinfo, NO_ESCAPE),
    _attrs: { ObjectType: "MODefinition" }
  }, NO_ESCAPE);
  let lwm2m = toXML({
    _name: 'LWM2M',
    _content: mo,
    _attrs: {
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:noNamespaceSchemaLocation':
        'http://openmobilealliance.org/tech/profiles/LWM2M.xsd'
    }
  }, NO_ESCAPE)
  return lwm2m
}

function translateResources(sdf, objName) {
  let resources = [];
  let sdfcapabilities = ["sdfProperty", "sdfAction"];
  let privateId = 1;

  for (cap in sdfcapabilities) {
    let capability = sdfcapabilities[cap];
    for (res in sdf.sdfObject[objName][capability]) {
      let sdfresource = sdf.sdfObject[objName][capability][res];
      let propPointer = "#/sdfObject/" + objName + "/" +
        capability + "/" + res;
      let ipsoproperty = {};

      if (sdfresource.label) {
        ipsoproperty.Name = sdfresource.label;
      } else {
        ipsoproperty.Name = res.replace(NAMEFIX_RE, NAMEFIX_CHAR);
      }

      if (capability === 'sdfAction') {
        ipsoproperty.Operations = "E";
      } else {
        let readable = ('readable' in sdfresource) ? sdfresource.readable : true;
        let writable = ('writable' in sdfresource) ? sdfresource.writable : true;
        
        if (readable && writable) {
          ipsoproperty.Operations = "RW";
        } else if (readable && !writable) {
          ipsoproperty.Operations = "R";
        } else if (!readable && writable) {
          ipsoproperty.Operations = "W";
        } else {
          // Neither readable nor writable - unusual case
          ipsoproperty.Operations = "";
        }
      }
      if ('type' in sdfresource) {
        ipsoproperty.MultipleInstances = (sdfresource.type == 'array') ?
          ('Multiple') : ('Single');
      }
      if ('sdfRequired' in sdf.sdfObject[objName]) {
        let required = sdf.sdfObject[objName].sdfRequired;
        if ((required.includes("#/sdfObject/" + objName + "/" + capability +
            "/" + res)) ||
            required.includes(res)) {
          ipsoproperty.Mandatory = 'Mandatory';
        } else {
          ipsoproperty.Mandatory = 'Optional';
        }
      }
      if ('sdfRequired' in sdfresource) {
        if (sdfresource.sdfRequired.includes(true)) {
          ipsoproperty.Mandatory = 'Mandatory';
        }
      }
      if ('type' in sdfresource) {
        ipsoproperty.Type = (sdfresource.type == 'array') ?
          convertType(sdfresource.items.type, sdfresource.items.sdfType,
            sdfresource.items.minimum) :
          convertType(sdfresource.type, sdfresource.sdfType,
            sdfresource.minimum);
      }

      if ('minimum' in sdfresource && 'maximum' in sdfresource) {
        ipsoproperty.RangeEnumeration = sdfresource.minimum + ".." +
          sdfresource.maximum;
      } else {
        ipsoproperty.RangeEnumeration = '';
      }

      ipsoproperty.Units = sdfresource.unit ? sdfresource.unit : '';

      ipsoproperty.Description = sdfresource.description;

      if (OMA_ID_QUALITY in sdfresource) {
        resourceID = sdfresource[OMA_ID_QUALITY];
      }
      else if (idmap.map[propPointer]) {
        resourceID = idmap.map[propPointer].id;
      } else {
        resourceID = privateId++;
      }

      let resource = toXML({
        _name: 'Item',
        _content: toXML(ipsoproperty, NO_ESCAPE),
        _attrs: { ID: resourceID }
      }, NO_ESCAPE);
      resources.push(resource);
    };
  };
  return resources;
}

function convertType(type, sdfType, min) {
  let lwType;

  switch (type) {
    case "string":
      lwType = "String";
      break;
    case "boolean":
      lwType = "Boolean";
      break;
    case "number":
      lwType = "Float";
      break;
    case "integer":
      if (min == 0) {
        lwType = "Unsigned Integer"
      } else {
        lwType = "Integer";
      }
      break;
    default:
      /* type not (yet) supported */
      lwType = "unknown (" + type + ")";
  }

  if (sdfType === "byte-string") {
    lwType = "Opaque";
  } else if (sdfType === "unix-time") {
    lwType = "Time";
  }

  return lwType;
}