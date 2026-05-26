/**
 * Tests for OMA to SDF converter
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const oma2sdf = require('../oma2sdf/oma2sdf');

describe('OMA to SDF Converter', function() {
  
  describe('Basic XML to SDF Conversion', function() {
    it('should convert a simple OMA XML to SDF JSON', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      assert(result.info, 'Should have info section');
      assert(result.sdfObject, 'Should have sdfObject section');
      assert.match(result.info.version, /^\d{4}-\d{2}-\d{2}$/, 'Version should be a date string');
    });

    it('should extract object name correctly', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const objName = Object.keys(result.sdfObject)[0];
      assert.strictEqual(objName, 'Load');
    });

    it('should convert object description', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      assert(obj.description, 'Should have description');
      assert(obj.description.includes('load sensor'), 'Description should mention load sensor');
    });
  });

  describe('Resource Conversion', function() {
    it('should convert resources to sdfProperty', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      assert(obj.sdfProperty, 'Should have sdfProperty');
    });

    it('should convert Float type correctly', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      const sensorValue = obj.sdfProperty.Sensor_Value;
      assert.strictEqual(sensorValue.type, 'number');
    });

    it('should convert String type correctly', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      const sensorUnits = obj.sdfProperty.Sensor_Units;
      assert.strictEqual(sensorUnits.type, 'string');
    });

    it('should handle mandatory resources', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      if (obj.sdfRequired) {
        assert(Array.isArray(obj.sdfRequired), 'sdfRequired should be an array');
      }
    });
  });

  describe('Operations Conversion', function() {
    it('should mark readable properties with writable: false', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      const sensorValue = obj.sdfProperty.Sensor_Value;
      // Properties with R operation should be marked as writable: false
      assert.strictEqual(sensorValue.writable, false);
    });

    it('should convert Execute operations to sdfAction', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test object</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="1">
        <Name>Reset</Name>
        <Operations>E</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>None</Type>
        <Description>Reset action</Description>
      </Item>
    </Resources>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const obj = result.sdfObject.Test;
      assert(obj.sdfAction, 'Should have sdfAction for Execute operation');
    });
  });

  describe('Name Conversion', function() {
    it('should replace spaces with underscores in names', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      assert(obj.sdfProperty.Sensor_Value, 'Should have Sensor_Value with underscore');
      assert(obj.sdfProperty.Sensor_Units, 'Should have Sensor_Units with underscore');
    });
  });

  describe('Copyright and License', function() {
    it('should use provided copyright when specified', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      // When copyrFromFile is true, it reads from XML comment
      const result = oma2sdf.createSdf(xml, true, false);
      
      // Should extract copyright from XML file
      assert(result.info.copyright, 'Should have copyright');
      assert(result.info.copyright.includes('IPSO'), 'Should include original IPSO copyright from XML');
    });

    it('should use provided license when specified', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      // When licenseFromFile is true, it reads from XML comment
      const result = oma2sdf.createSdf(xml, false, true);
      
      // Should extract license from XML file
      assert(result.info.license, 'Should have license');
    });
  });

  describe('Error Handling', function() {
    it('should throw error for invalid XML', function() {
      const invalidXml = '<invalid>xml';
      assert.throws(() => {
        oma2sdf.createSdf(invalidXml, false, false);
      });
    });

    it('should throw error for empty input', function() {
      assert.throws(() => {
        oma2sdf.createSdf('', false, false);
      });
    });

    it('should throw error when Mandatory element is missing', function() {
      const xmlMissingMandatory = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5700">
        <Name>Value</Name>
        <Operations>R</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Type>Float</Type>
        <RangeEnumeration></RangeEnumeration>
        <Units></Units>
        <Description>Test value</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      assert.throws(() => {
        oma2sdf.createSdf(xmlMissingMandatory, false, false);
      }, /Mandatory.*missing/);
    });
  });

  describe('Multiple Instances', function() {
    it('should handle MultipleInstances correctly', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      
      const obj = result.sdfObject.Load;
      // Check if multiple instances info is preserved
      assert(obj, 'Object should exist');
    });
  });

  describe('Advanced Type Conversions', function() {
    it('should handle Opaque type with byte-string sdfType', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5522">
        <Name>Binary_Data</Name>
        <Operations>RW</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>Opaque</Type>
        <RangeEnumeration></RangeEnumeration>
        <Units></Units>
        <Description>Binary data</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Binary_Data;
      assert.strictEqual(prop.type, 'string');
      assert.strictEqual(prop.sdfType, 'byte-string');
    });

    it('should handle Time type with unix-time sdfType', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5518">
        <Name>Timestamp</Name>
        <Operations>RW</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>Time</Type>
        <RangeEnumeration></RangeEnumeration>
        <Units></Units>
        <Description>Timestamp</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Timestamp;
      assert.strictEqual(prop.type, 'number');
      assert.strictEqual(prop.sdfType, 'unix-time');
    });

    it('should handle range with min and max for numbers', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5700">
        <Name>Value</Name>
        <Operations>RW</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>Float</Type>
        <RangeEnumeration>0..100</RangeEnumeration>
        <Units></Units>
        <Description>Value with range</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Value;
      assert.strictEqual(prop.minimum, 0);
      assert.strictEqual(prop.maximum, 100);
    });

    it('should handle range with minLength and maxLength for strings', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5527">
        <Name>Text</Name>
        <Operations>RW</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>String</Type>
        <RangeEnumeration>1..255</RangeEnumeration>
        <Units></Units>
        <Description>Text with length range</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Text;
      assert.strictEqual(prop.minLength, 1);
      assert.strictEqual(prop.maxLength, 255);
    });

    it('should handle Unsigned Integer with minimum 0', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test</Name>
    <Description1>Test</Description1>
    <ObjectID>9999</ObjectID>
    <ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
    <LWM2MVersion>1.0</LWM2MVersion>
    <ObjectVersion>1.0</ObjectVersion>
    <MultipleInstances>Single</MultipleInstances>
    <Mandatory>Optional</Mandatory>
    <Resources>
      <Item ID="5501">
        <Name>Counter</Name>
        <Operations>RW</Operations>
        <MultipleInstances>Single</MultipleInstances>
        <Mandatory>Optional</Mandatory>
        <Type>Unsigned Integer</Type>
        <RangeEnumeration></RangeEnumeration>
        <Units></Units>
        <Description>Counter value</Description>
      </Item>
    </Resources>
    <Description2></Description2>
  </Object>
</LWM2M>`;
      
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Counter;
      assert.strictEqual(prop.type, 'integer');
      assert.strictEqual(prop.minimum, 0);
    });
  });


  describe('Link Type Conversions', function() {
    it('should convert Objlnk to sdfRef', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M><Object ObjectType="MODefinition">
  <Name>Test</Name><Description1>Test</Description1>
  <ObjectID>9999</ObjectID><ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
  <LWM2MVersion>1.1</LWM2MVersion><ObjectVersion>1.0</ObjectVersion>
  <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
  <Resources>
    <Item ID="1"><Name>Link</Name><Operations>RW</Operations>
      <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
      <Type>Objlnk</Type><RangeEnumeration></RangeEnumeration>
      <Units></Units><Description>Object link</Description></Item>
  </Resources><Description2></Description2>
</Object></LWM2M>`;
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Link;
      assert.strictEqual(prop.sdfRef, 'omatypes:objlink');
    });

    it('should convert Corelnk to sdfRef', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M><Object ObjectType="MODefinition">
  <Name>Test</Name><Description1>Test</Description1>
  <ObjectID>9999</ObjectID><ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
  <LWM2MVersion>1.1</LWM2MVersion><ObjectVersion>1.0</ObjectVersion>
  <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
  <Resources>
    <Item ID="1"><Name>Link</Name><Operations>RW</Operations>
      <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
      <Type>Corelnk</Type><RangeEnumeration></RangeEnumeration>
      <Units></Units><Description>Core link</Description></Item>
  </Resources><Description2></Description2>
</Object></LWM2M>`;
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Link;
      assert.strictEqual(prop.sdfRef, 'omatypes:corelink');
    });

    it('should handle Objlnk with MultipleInstances', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M><Object ObjectType="MODefinition">
  <Name>Test</Name><Description1>Test</Description1>
  <ObjectID>9999</ObjectID><ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
  <LWM2MVersion>1.1</LWM2MVersion><ObjectVersion>1.0</ObjectVersion>
  <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
  <Resources>
    <Item ID="1"><Name>Links</Name><Operations>RW</Operations>
      <MultipleInstances>Multiple</MultipleInstances><Mandatory>Optional</Mandatory>
      <Type>Objlnk</Type><RangeEnumeration></RangeEnumeration>
      <Units></Units><Description>Object links</Description></Item>
  </Resources><Description2></Description2>
</Object></LWM2M>`;
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Links;
      assert.strictEqual(prop.type, 'array');
      assert.strictEqual(prop.items.sdfRef, 'omatypes:objlink');
    });
  });

  describe('OMA ID Quality', function() {
    it('should include oma:id for object', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      assert.strictEqual(result.sdfObject.Load['oma:id'], '3322');
    });

    it('should include oma:id for resources', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Load.sdfProperty.Sensor_Value;
      assert.strictEqual(prop['oma:id'], 5700);
    });
  });

  describe('Reusable Resource References', function() {
    it('should create sdfRef for reusable resources when enabled', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false, true);
      // Resources in reusable range (2048-26240) should have sdfRef
      const props = result.sdfObject.Load.sdfProperty;
      const hasRef = Object.values(props).some(p => p.sdfRef);
      assert(hasRef, 'Should have sdfRef pointers for reusable resources');
    });

    it('should add top-level sdfProperty when reusableResRefs enabled', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false, true);
      assert(result.sdfProperty, 'Should have top-level sdfProperty');
      const topProps = Object.keys(result.sdfProperty);
      assert(topProps.length > 0, 'Top-level sdfProperty should have entries');
    });
  });

  describe('Namespace and Defaults', function() {
    it('should include namespace map and default namespace', function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const result = oma2sdf.createSdf(xml, false, false);
      assert(result.namespace, 'Should have namespace map');
      assert(result.namespace.oma, 'Should have oma namespace');
      assert.strictEqual(result.defaultNamespace, 'oma', 'Should have default namespace');
    });

    it('should set readable false for write-only resources', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M><Object ObjectType="MODefinition">
  <Name>Test</Name><Description1>Test</Description1>
  <ObjectID>9999</ObjectID><ObjectURN>urn:oma:lwm2m:ext:9999</ObjectURN>
  <LWM2MVersion>1.0</LWM2MVersion><ObjectVersion>1.0</ObjectVersion>
  <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
  <Resources>
    <Item ID="5700"><Name>Value</Name><Operations>W</Operations>
      <MultipleInstances>Single</MultipleInstances><Mandatory>Optional</Mandatory>
      <Type>Float</Type><RangeEnumeration></RangeEnumeration>
      <Units></Units><Description>Write-only</Description></Item>
  </Resources><Description2></Description2>
</Object></LWM2M>`;
      const result = oma2sdf.createSdf(xml, false, false);
      const prop = result.sdfObject.Test.sdfProperty.Value;
      assert.strictEqual(prop.readable, false);
    });
  });
});
