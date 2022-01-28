/**
 * DTDL to One Data Model SDF converter
 * @author Petri Laari
 * @author Ari Keränen
 */

const fs = require('fs');
const debug = require('debug')('dtdl2sdf');

const UNIT_MAP = require("./dtdl-sdf-unitmap.json");

const TITLE_PREFIX = "DTDL"; 
const VERSION = "TBD";

const ODM_FILE_PREFIX = "sdfobject-";
const ODM_FILE_SUFFIX = ".sdf.json";

const NAMEFIX_RE = new RegExp('[\\s,\\/]', "g");
const NAMEFIX_CHAR = "_";

const TERMS_NS = "https://example.com/relations-terms";
const TERMS_NS_SHORT = "terms";

const DEFAULT_NS_HEAD = "https://onedm.example.com/";

/* Map of DTDL schema types to SDF types */
const DTDL_SCHEMA_TO_SDF_TYPE = {
  "boolean": "boolean",
  "double": "number",
  "float": "number", /* "number" covers also "float" (SDF spec) */
  "integer": "integer",
  "string": "string",
  "dateTime": [ "date-time", "string" ],
  "time": "time",
  "date": "date"
}

/* Map of terms */
const DTDL_TO_SDF_TERMS = {
  "schema": "type",
  "displayName": "label"
}

/* default values if can't parse from input file */
// TBD!
const DEF_COPYRIGHT = "Copyright 2022";
const DEF_LICENSE = "";

exports.createSDF = createSDF;

let requiredComponents = [];

if (require.main === module) { /* run as stand-alone? */
  if (process.argv.length == 3) { /* file as command line parameter */
    var inFile = process.argv[2];
    let data = fs.readFileSync(inFile, {encoding: 'utf-8'});
    console.log(JSON.stringify(createSDF(data, null, true), null, 2));
  } 

/* Experimental support for multiple input files at the moment
  1st file: the main "thing", rest of the files: objects to be added 
  to the thing if specified in 1st file */

  else if (process.argv.length > 3) { 
    let sdfFinal;
    let firstObject = true;
    process.argv.slice(2).forEach (inFile => {
      let data = fs.readFileSync(inFile, {encoding: 'utf-8'});
      if (firstObject) {
        sdfFinal = createSDF(data, sdfFinal, firstObject);
      } else {
        let newObject = createSDF(data, sdfFinal, firstObject);
        if (sdfFinal.sdfThing) {
          sdfFinal.sdfThing.sdfObject = { ...sdfFinal.sdfThing.sdfObject, 
                                        ...newObject };
        }
      } 
      firstObject = false;
    });
    console.log(JSON.stringify(sdfFinal, null, 2));
  } else {
    console.log("Usage: node dtdl2sdf.js <main DTDL file>", 
                "<potential reference files>");
  }
}

function createHeader(name) {
  let headObj = {"info": {}};
  headObj.info.title = TITLE_PREFIX + " " + name;
  headObj.info.version = VERSION;
  headObj.info.copyright = DEF_COPYRIGHT;
  headObj.info.license = DEF_LICENSE;
  return headObj;
}

function addNamespace(ns, nsName, nsTarget) {
  if (ns[nsName]) {
    /* Namespace exists already */
    if (ns[nsName] != nsTarget) {
      /* New namespace with same name, do some trick here*/
    } 
  } else {
    /* New namespace */
    ns[nsName] = nsTarget;
  }
}

function getLangString (selection) {
  /* Currently the language support is limited to English [en]. In the future, 
     this can be extended with a more generic approach supporting all
     languages */
  if (typeof selection === 'string') {
    return selection;
  } else {
    if (selection.en) {
      return "[en] " + selection.en;
    } else {
      return "[lang_not_defined] " + selection[0];
    }
  }
}

function addExtends (ns, dtdlExt, defNS) {
  extSplit = dtdlExt.split(/;|:/);
  let newRefName = extSplit[extSplit.length - 2];
  let newRefNSShort = extSplit[extSplit.length - 3];
  let newRefNS = extSplit.splice(0, extSplit.length - 2);
  let refRet = "";
  newRefNS = newRefNS.join('/');
  addNamespace(ns, newRefNSShort, DEFAULT_NS_HEAD + newRefName);
  if (newRefNSShort == defNS) {
    refRet= "#/" + newRefName;
  } else {
    refRet = newRefNSShort + ":" + newRefName;
  }
  return refRet;
}

function createSDF(dtdlIn, sdfSet, firstObject) {
  if (!sdfSet) {
    sdfSet = [];
  }
  dtdlIn = JSON.parse(dtdlIn);
  /* In case of array: TBD */
  if (Array.isArray(dtdlIn)) {
    if (dtdlIn.length != 1) {
      throw new Error("Multiple DTDLs in an Array not yet supported");
    }
    dtdl = dtdlIn[0];
  } else {
    dtdl = dtdlIn;
  }

  let sdfObjects = [];
  let sdfOutput = {};
  let sdfProperty = {};
  let sdfEvent = {};
  let sdfAction = {};
  let sdfData = {};
  let sdfRelation = {};
  let sdfRef = [];
  let descr = "";
  let i = 0;
  let idString = dtdl['@id'];
  let idString_split = dtdl['@id'].split(/;|:/);
  let objName = idString_split[idString_split.length - 2];

  let header = createHeader(objName);
  sdfOutput = header;
  sdfOutput.namespace = {};
  addNamespace(sdfOutput.namespace, TERMS_NS_SHORT, TERMS_NS);

  let defaultNSshort = idString_split[idString_split.length - 3];
  let defaultNS = idString_split.splice(0,idString_split.length - 2);

  defaultNS = defaultNS.join('/');
  addNamespace( sdfOutput.namespace, defaultNSshort, 
                DEFAULT_NS_HEAD + defaultNS);
  sdfOutput.defaultNamespace = defaultNSshort;

  objDescription = getLangString(dtdl['description'] ? dtdl['description']
                        : dtdl['comment'] ? dtdl['comment'] : "");

  if (dtdl.extends) {
    if (Array.isArray(dtdl.extends)) {
      while (i<dtdl.extends.length) {
        sdfRef[i] = addExtends(sdfOutput.namespace, dtdl['extends'][i], defaultNSshort);
        i++;
      }
    } else {
      sdfRef[0] = addExtends(sdfOutput.namespace, dtdl.extends, defaultNSshort);
    }
  }

  dtdl.contents.forEach( res => {
    if ( typeof res['@type'] != 'string' ) {
      switch (res['@type'][0]) {
        case "Property":
          sdfProperty[res.name] = setContent(res);
          break;
        case "Telemetry":
          sdfEvent[res.name] = setContent(res);
          break;
        }
    } else {
      let sdfThingObj = {};
      switch (res['@type']) {
        case "Property":
          sdfProperty[res.name] = setContent(res);
          break;
        case "Command":
          [sdfAction[res.name], sdfData] = setActionContent(res);
          break;
        case "Component": 
          if(res.description) {
            descr = getLangString(res.description);
            sdfThingObj = {"label": res.name, 
                            "description": descr};
          } else {
            sdfThingObj = {"label": res.name};
          }
          requiredComponents.push(res.schema);
          let schema_split = res.schema.split(/;|:/);
          sdfThingObj.sdfRef = "#/sdfObject/" + 
                                schema_split[schema_split.length - 2];
          sdfObjects.push({[res.name]: sdfThingObj});
          break;
        case "Relationship":
          if (res.target) {
            targetStrSplit = res.target.split(/;|:/);
            let targetObject = targetStrSplit[targetStrSplit.length - 2];

            /* TBD: not necessarily unique */
            newNSshort = targetStrSplit[targetStrSplit.length - 3];
            newNS = targetStrSplit.splice(0,targetStrSplit.length - 2);
            newNS = newNS.join('/');

            addNamespace(sdfOutput.namespace, newNSshort, DEFAULT_NS_HEAD + newNS);

            sdfRelation[res.name] = {"type": TERMS_NS_SHORT + ":TBD", 
                                    "target": newNSshort + ":#/" + targetObject};
          } else {
            /* No target specified, target can be any Interface */
            sdfRelation[res.name] = {};
          }
          // We are using now either description or comment in the SDF descr.
          descr = getLangString(res.description ? res.description : res.comment
                               ? res.comment : "");
          if (descr != "") {
            sdfRelation[res.name].description = descr;
          }
          break;
      }
    }
  });

  if (sdfObjects.length > 1) {
    /* We have an sdfThing */
    if (dtdl.description) {
      sdfOutput.sdfThing = {"label": dtdl.displayName, 
                            "description": getLangString(dtdl.description)};
    } else {
      sdfOutput.sdfThing = {"label": dtdl.displayName};
    }
    sdfOutput.sdfThing.sdfObject = populateOutput(objName, objDescription, sdfProperty, 
                                    sdfAction, sdfEvent, sdfRelation, sdfData, sdfRef);

    sdfObjects.forEach( res => {
      sdfOutput.sdfThing.sdfObject = {...sdfOutput.sdfThing.sdfObject, ...res};

    });
  } else {
    /* We have just one object */
    sdfOutput.sdfObject = populateOutput(objName, objDescription, sdfProperty, 
                          sdfAction, sdfEvent, sdfRelation, sdfData, sdfRef);
  }
  if(firstObject) {
    return sdfOutput;
  } else if (!firstObject && requiredComponents.includes(idString)) {
    return sdfOutput.sdfObject;
  } else {
    return null;
  }
};

function populateOutput(dispName, objDesc,  sdfProperty, sdfAction, 
                        sdfEvent, sdfRelation, sdfData, sdfRefIn) {

  let outObj = {};
  let tmpObj = {};
  let i = 0;

  if (objDesc != "") {
    tmpObj = {description: objDesc};
  }
  if (Object.keys(sdfProperty).length > 0) {
    tmpObj = {...tmpObj, sdfProperty};
  }
  if (Object.keys(sdfAction).length > 0) {
    tmpObj = {...tmpObj, sdfAction};
  }
  if (Object.keys(sdfEvent).length > 0) {
    tmpObj = {...tmpObj, sdfEvent};
  }
  if (Object.keys(sdfRelation).length > 0) {
    tmpObj = {...tmpObj, sdfRelation};
  }
  if (Object.keys(sdfData).length > 0) {
    tmpObj = {...tmpObj, sdfData};
  }

  if (Object.keys(sdfRefIn).length > 0) {
    while (i < sdfRefIn.length) {
      /* TBD: Multiple sdfRefs not handled, it is not clear how they should
      be presented in SDF, now only the last one is in the SDF output */
      let sdfRef = sdfRefIn[i];
      tmpObj = {...tmpObj, sdfRef};
      i++;
    }
  }
  outObj = {[dispName]: tmpObj};
  return outObj;
}

function setContent(res) {
  let value; 
  if (res.schema) {
    value = res.schema;
  } else {
    throw new Error("Not supported schema in the DTDL file");
  }
  let descr = ""; 
  let dstObj = {};
  let sdfChoice= {};
  let descFound = false;
  let enums = [];
  let objProperties = {};

  /* TBD: if multiple languages in description, only "en" is now supported. */
  descr = getLangString(res.description ? res.description : 
                        res.comment ? res.comment : "");

  dstObj.label = res.name;
  if (descr != "") {
    dstObj.description = descr;
  }

  if (res.writable) {
    dstObj.writable = res.writable;
  }

  if ( value && typeof value === 'string') {
      xlate (dstObj, "type", value, (x) => {
        return DTDL_SCHEMA_TO_SDF_TYPE[x]
      });
  } else if (typeof value === 'object') {
    if ( value['@type'] == 'Enum') {
      if (value.valueSchema != 'string') {
        throw new Error("Non-string Enum not yet supported!");
      } else {
        /* Pure enum also supported according to SDF 1.1. If any of the enum 
        values in DTDL contain description, we use sdfChoice not to lose the 
        description information, else we use directly enum. */
        let eVals;
        if (value.enumValues) {
          eVals = value.enumValues;
        } else {
          throw new Error("No enumValues found / wrong type of field");
        }
        eVals.forEach ( res => {
          dstObj.type=DTDL_SCHEMA_TO_SDF_TYPE[value.valueSchema];
          sdfChoice[res.enumValue] = {};
          enums.push(res.enumValue);
          if (res.description) {
            descFound = true;
            sdfChoice[res.enumValue].description = getLangString(res.description);
          }
        });
      }
    } else if (value['@type'] == 'Object') {
      /* Handle the complex schema Object */
      dstObj.type="object";
      let fields; 
      if (value.fields) {
        fields = value.fields;
      }
      /* Currently only name and schema from DTDL are supported */
      let sdfProps = {};
      fields.forEach ( res => {
        sdfProps = {};
        if (res.schema) {
          sdfProps.type =  DTDL_SCHEMA_TO_SDF_TYPE[res.schema];
        }
        if (res.description) {
          sdfProps.description = getLangString (res.description);
        }
        objProperties[res.name] = sdfProps;
      })
    } else { 
      throw new Error ("Only complex schema Enum and Object supported at the moment");
    }
    if(descFound) {
      dstObj.sdfChoice = sdfChoice;
    } else if (value['@type']=='Enum') {
      dstObj.enum = enums;
    } else if (value['@type']=='Object') {
      dstObj.properties = objProperties;
    }
  }
  
  if (res.unit) {
    dstObj.unit = UNIT_MAP[res['@type'][1]][res.unit];
  };
  return dstObj;
}

function setActionContent(res) {
  let descr = "";
  let dstObj = {};
  let dstData = {};
  let sdfInputData = [];
  let sdfOutputData = [];

  if (res.description) {
    descr = getLangString(res.description);
    dstObj = {
      "label": res.displayName,
      "description": descr
    }
  }  else {
    dstObj = {
      "label": res.displayName
    }
  }
  if (res.request) {
    let sdfDataIn = {"label": res.request.displayName, 
                     "description": res.request.description};
    sdfInputData.push("#/sdfData/"+res.request.name);
    xlate (sdfDataIn, "type", res.request.schema, (x) => {
      return DTDL_SCHEMA_TO_SDF_TYPE[x]
    });
    dstData = { ...dstData, [res.request.name]: sdfDataIn}
    dstObj = { ...dstObj, sdfInputData};
  }
  if (res.response) {
    res.response.schema.fields.forEach ( resp => {
      sdfOutputData.push("#/sdfData/"+resp.name);
      let sdfDataIn = {};
      sdfDataIn.label = resp.displayName; 
      if (resp.schema) {
        xlate (sdfDataIn, "type", resp.schema, (x) => {
          return DTDL_SCHEMA_TO_SDF_TYPE[x]
        })
      }
      dstData = {...dstData, [resp.name]: sdfDataIn}
    });
    dstObj = { ...dstObj, sdfOutputData};
  }
  return [dstObj, dstData];
}

function xlate(dstObj, dstField, value, trans) {
  if (value != undefined) {
    if (trans) {
      if (trans(value) != undefined && (typeof trans(value) === 'string') ) {
        dstObj[dstField] = trans(value);
      } else if (trans(value)) {
        dstObj[dstField] = trans(value)[1];
        dstObj["format"] = trans(value)[0];
      } else {
        debug("Can't translate " + value + " for field " + dstField);
      }
    }
    else {
      dstObj[dstField] = value;
    }
  }
}
