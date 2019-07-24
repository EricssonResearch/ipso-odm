/**
 * IPSO model to One Data Model SDF converter
 * @author Ari Keränen
 */

const fs = require('fs');
const xmldoc = require('xmldoc');
const app = require('express')();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const debug = require('debug')('ipso2odm');

const TITLE_PREFIX = "OMA LwM2M";
const VERSION = "20190722";
const LWM2M_ODM_NS = "http://example.com/lwm2m/odm";
const LWM2M_NS_PREFIX = "lwm2m";
const DEF_IS_OBSERVABLE = true;

/* default values if can't parse from input file */
const DEF_COPYRIGHT = "TBD";
const DEF_LICENSE = "TBD"

const PORT = process.env.PORT || 8083;

app.use(helmet());
app.use(bodyParser.raw({type: '*/*'}));

if (process.argv.length == 3) { /* file as command line parameter */
  var inFile = process.argv[2];
  fs.readFile(inFile, {encoding: 'utf-8'}, function(err, data) {
    try {
      let odm = createOdm(data);
      console.log(JSON.stringify(odm, null, 2));
    } catch (err) {
      debug("Can't convert. " + err);
    }
    });
}

app.post('/ipso2odm', (req, res) => {
  debug("Request from: " + req.ip);
  try {
    let odm = createOdm(req.body.toString().trim());
    let json = JSON.stringify(odm, null, 2);
    debug("Converted info title: %s", odm.info.title);
    res.set('Content-Type', 'application/json')
    res.send(json);
  } catch(err) {
    debug(err);
    res.status(400).send("Can't convert. " + err);
  }
});

app.get('/', (req, res) => {
    res.send("ipso2odm web service: POST LwM2M schema file to /ipso2odm");
});

if (process.argv.length == 2) { /* no command line params */
  app.listen(PORT, () => {
    console.log(`Starting web service on port ${PORT}`);
  });
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
  let odmProplist;
  let copyRight = DEF_COPYRIGHT;
  let license = DEF_LICENSE;

  /* hacky way to extract copyright and license info from XML comment */
  let copyStart = data.indexOf("\nCopyright");
  let copyEnd = data.indexOf('\n', copyStart + 1);
  if (copyStart > 1) { /* Found copyright line */
    copyRight = data.substring(copyStart, copyEnd).trim();
    license = data.substring(copyEnd, data.indexOf("-->")).trim();
  }

  odm.info = {
    "title":  TITLE_PREFIX + " " + obj.childNamed("Name").val +
      " (Object ID " + obj.childNamed("ObjectID").val + ")" ,
    "version": VERSION,
    "copyright": copyRight,
    "license": license
  }

  odm.namespace = {};
  odm.namespace[LWM2M_NS_PREFIX] = LWM2M_ODM_NS;
  odm.defaultNamespace = LWM2M_NS_PREFIX;

  odmObj[objName] = {
    "id" : JSON.parse(obj.childNamed("ObjectID").val),
    "name" : obj.childNamed("Name").val,
    "description" : obj.childNamed("Description1").val,
    "odmProperty" : {}
  };

  odm.odmObject = odmObj;

  odmProplist = odmObj[objName].odmProperty = {};
  odmActlist = odmObj[objName].odmAction = {};
  reqList = odmObj[objName].required = [];

  obj.childNamed("Resources").children.forEach(res => {
    if (res.type === "text") {
      return;
    }

    let name = res.childNamed("Name").val;
    let isAction = res.childNamed("Operations").val.includes("E");
    let list = isAction ? odmActlist : odmProplist;

    let odmItem = list[name] = {
      "name": name,
      "id": JSON.parse(res.attr.ID),
      "description": res.childNamed("Description").val,
    }

    if (!isOptional(res)) {
      reqList.push(name);
    }

    if (!isAction) {
      odmItem.readOnly = isReadOnly(res);
      odmItem.observable = DEF_IS_OBSERVABLE
      addResourceType(odmItem, res);
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
 * Returns true if the given LwM2M schema 'Operations' element contains
 * value 'R' but no value 'W'
 * @param {XmlElement} lwm2mElement The LwM2M schema element
 */
function isReadOnly(lwm2mElement) {
  let opers = lwm2mElement.childNamed("Operations").val;
  return opers.includes("R") && !opers.includes("W");
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
      odmProp.minvalue = 0;
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