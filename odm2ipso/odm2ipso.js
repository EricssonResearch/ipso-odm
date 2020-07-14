/**
 * One Data Model SDF to IPSO converter
 * @author Niklas Widell
 */

var fs = require('fs');
var xmlformatter = require('xml-formatter');
const debug = require('debug')('odm2ipso');
const { toXML } = require('jstoxml');

const VERSION = "1.0";
const OBJ_URN_BASE = 'urn:oma:lwm2m:ext:';
const PREAMPLE_PREFIX =
  '<?xml version="1.0" encoding="UTF-8"?>\n<!--\n'
const ID_MAP_FILE = "idmap.json";
const DEFAULT_OBJ_ID = 65535;

/* convert name underscores to spaces (for ipso2odm round trip) */
const NAMEFIX_RE = new RegExp('[_]', "g");
const NAMEFIX_CHAR = " ";

exports.getFormattedXml = getFormattedXml;

/* Initialize ID mapping from file (default idmap.json) */
let idmap = {
  map: {}
};
fs.readFile(ID_MAP_FILE, { encoding: 'utf-8' }, function (err, data) {
  if (err) {
    console.error("Can't read " + ID_MAP_FILE);
  } else {
    idmap = JSON.parse(data);
  }
});

if (require.main === module) { /* run as stand-alone? */
  if (process.argv.length == 3) {/* input file as cmd line parameter */
    var inFile = process.argv[2];
    fs.readFile(inFile, { encoding: 'utf-8' }, function (err, data) {
      try {
        let odm = JSON.parse(data);
        console.log(getFormattedXml(odm));
      } catch (err) {
        console.log("Can't convert. " + err);
      }
    });
  }
}

function getFormattedXml(odm) {
  let ipsoinfo = translateODMObject(odm);
  let preamble = PREAMPLE_PREFIX + odm.info.copyright + '\n' +
    odm.info.license + '\n-->\n';
  let ipsofile = preamble + xmlformatter(ipsoinfo,
    { collapseContent: true });

  return ipsofile;
}

function translateODMObject(odm) {
  let objname = Object.keys(odm.sdfObject)[0];
  let objid = DEFAULT_OBJ_ID;
  let sdfobject = odm.sdfObject[objname];
  let ipsoinfo = {};

  if (idmap.map && idmap.map["#/" + objname]) {
    objid = idmap.map["#/" + objname].id;
  } else {
    debug("Using default object ID " + objid);
  }
  ipsoinfo.Name = objname.replace(NAMEFIX_RE, NAMEFIX_CHAR);

  if ('description' in sdfobject) {
    ipsoinfo.Description1 = sdfobject.description;
  }

  ipsoinfo.ObjectID = objid;
  ipsoinfo.ObjectURN = OBJ_URN_BASE + objid;
  ipsoinfo.LWM2MVersion = VERSION;
  ipsoinfo.ObjectVersion = VERSION;
  ipsoinfo.MultipleInstances = 'Multiple';
  ipsoinfo.Mandatory = 'Optional';
  ipsoinfo.Resources = toXML(translateResources(odm, objname));

  let mo = toXML({
    _name: 'Object',
    _content: toXML(ipsoinfo),
    _attrs: { ObjectType: "MODefinition" }
  });
  let lwm2m = toXML({
    _name: 'LWM2M',
    _content: mo,
    _attrs: {
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:noNamespaceSchemaLocation':
        'http://openmobilealliance.org/tech/profiles/LWM2M.xsd'
    }
  })
  return lwm2m
}

function translateResources(odm, objName) {
  let resources = [];
  let sdfcapabilities = ["sdfProperty", "sdfAction"];
  let privateId = 1;

  for (cap in sdfcapabilities) {
    let capability = sdfcapabilities[cap];
    for (res in odm.sdfObject[objName][capability]) {
      let sdfresource = odm.sdfObject[objName][capability][res];
      let propPointer = "#/" + objName + "/" + res;
      let ipsoproperty = {
        "Name": res.replace(NAMEFIX_RE, NAMEFIX_CHAR)
      };

      if ('writable' in sdfresource) {
        ipsoproperty.Operations = (sdfresource.writable) ?
         ("RW") : ("R");
      } else if (capability === 'sdfAction') {
        ipsoproperty.Operations = "E";
      } else {
        ipsoproperty.Operations = "RW";
      }
      if ('type' in sdfresource) {
        ipsoproperty.MultipleInstances = (sdfresource.type == 'array') ?
          ('Multiple') : ('Single');
      }
      if ('sdfRequired' in odm.sdfObject[objName]) {
        ipsoproperty.Mandatory = (odm.sdfObject[objName].sdfRequired.
          includes("0/" + capability + "/" + res)) ?
          ('Mandatory') : ('Optional');
      }
      if ('type' in sdfresource) {
        ipsoproperty.Type = (sdfresource.type == 'array') ?
          convertType(sdfresource.items.type, sdfresource.items.subtype,
            sdfresource.items.minimum) :
          convertType(sdfresource.type, sdfresource.subtype,
            sdfresource.minimum);
      }

      if ('minimum' in sdfresource && 'maximum' in sdfresource) {
        ipsoproperty.RangeEnumeration = sdfresource.minimum + ".." +
          sdfresource.maximum;
      } else {
        ipsoproperty.RangeEnumeration = '';
      }

      ipsoproperty.Units = sdfresource.units ? sdfresource.units : '';

      ipsoproperty.Description = sdfresource.description;

      if (idmap.map[propPointer]) {
        resourceID = idmap.map[propPointer].id;
      } else {
        resourceID = privateId++;
      }

      let resource = toXML({
        _name: 'Item',
        _content: toXML(ipsoproperty),
        _attrs: { ID: resourceID }
      });
      resources.push(resource);
    };
  };
  return resources;
}

function convertType(sdfType, sdfSubType, min) {
  let type;

  switch (sdfType) {
    case "string":
      type = "String";
      break;
    case "boolean":
      type = "Boolean";
      break;
    case "number":
      type = "Float";
      break;
    case "integer":
      if (min == 0) {
        type = "Unsigned Integer"
      } else {
        type = "Integer";
      }
      break;
    default:
      /* type not (yet) supported */
      type = "unknown (" + sdfType + ")";
  }

  if (sdfSubType === "byte-string") {
    type = "Opaque";
  } else if (sdfSubType === "unix-time") {
    type = "Time";
  }

  return type;
}