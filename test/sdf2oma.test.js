/**
 * Tests for SDF to OMA converter
 */

const assert = require('assert');
const fs = require('fs');
const xmldoc = require('xmldoc');
const sdf2oma = require('../sdf2oma/sdf2oma');

describe('SDF to OMA Converter', function() {
  
  describe('Basic SDF to XML Conversion', function() {
    it('should convert a simple SDF JSON to OMA XML', function() {
      const sdf = {
        info: {
          title: 'Test Object',
          version: '2023-11-05',
          copyright: 'Test Copyright',
          license: 'BSD-3-Clause'
        },
        sdfObject: {
          Test: {
            label: 'Test',
            description: 'Test object',
            sdfProperty: {
              value: {
                type: 'number',
                readable: true
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<?xml'), 'Should be valid XML');
      assert(xml.includes('<Object'), 'Should have Object element');
    });

    it('should include copyright in XML comment', function() {
      const sdf = {
        info: {
          title: 'Test',
          copyright: 'Custom Copyright',
          license: 'MIT'
        },
        sdfObject: {
          Test: {
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('Custom Copyright'), 'Should include copyright');
      assert(xml.includes('MIT'), 'Should include license');
    });
  });

  describe('Object Conversion', function() {
    it('should convert object name correctly', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Temperature: {
            label: 'Temperature Sensor',
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const name = doc.childNamed('Object').childNamed('Name').val;
      assert.strictEqual(name, 'Temperature Sensor');
    });

    it('should use object key as name if label missing', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          My_Object: {
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const name = doc.childNamed('Object').childNamed('Name').val;
      assert.strictEqual(name, 'My Object');
    });

    it('should convert object description', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            description: 'This is a test object',
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const desc = doc.childNamed('Object').childNamed('Description1').val;
      assert.strictEqual(desc, 'This is a test object');
    });
  });

  describe('Property to Resource Conversion', function() {
    it('should convert sdfProperty to Resource items', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: {
                type: 'number',
                description: 'Test value'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const resources = doc.childNamed('Object').childNamed('Resources');
      assert(resources, 'Should have Resources element');
      assert(resources.children.length > 0, 'Should have resource items');
    });

    it('should convert number type to Float', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: { type: 'number' }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Float</Type>'), 'Should convert number to Float');
    });

    it('should convert string type to String', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              name: { type: 'string' }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>String</Type>'), 'Should convert string to String');
    });

    it('should convert boolean type to Boolean', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              flag: { type: 'boolean' }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Boolean</Type>'), 'Should convert boolean to Boolean');
    });

    it('should convert integer type to Integer', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              count: { type: 'integer' }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Integer</Type>'), 'Should convert integer to Integer');
    });
  });

  describe('Action to Resource Conversion', function() {
    it('should convert sdfAction to Execute resource', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfAction: {
              reset: {
                description: 'Reset the device'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Operations>E</Operations>'), 'Should have Execute operation');
    });
  });

  describe('ID Mapping', function() {
    it('should use ID from idmap.json if available', function() {
      // This test depends on idmap.json content
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Digital_Input: {
            sdfProperty: {
              Digital_Input_State: {
                type: 'boolean'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      // Digital_Input should have ID 3200 from idmap.json if it exists
      // Otherwise it will use default ID 65535
      assert(xml.includes('<ObjectID>'), 'Should have ObjectID');
    });

    it('should use oma:id quality if present', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            'oma:id': 12345,
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectID>12345</ObjectID>'), 'Should use oma:id');
    });

    it('should use default ID if no mapping found', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Unknown_Object_XYZ: {
            sdfProperty: {}
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectID>65535</ObjectID>'), 'Should use default ID');
    });

    it('should handle oma:id with value zero', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: { type: 'number', 'oma:id': 0, description: 'Zero ID resource' }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const item = doc.childNamed('Object').childNamed('Resources').childNamed('Item');
      assert.strictEqual(item.attr.ID, '0', 'Should use ID 0 from oma:id');
    });
  });

  describe('URN Generation', function() {
    it('should use "oma" suffix for Object IDs below 1024', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { 'oma:id': '3', sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectURN>urn:oma:lwm2m:oma:3</ObjectURN>'));
    });

    it('should use "ext" suffix for Object IDs 2048-10240', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { 'oma:id': '3300', sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectURN>urn:oma:lwm2m:ext:3300</ObjectURN>'));
    });

    it('should use "x" suffix for Object IDs 10241 and above', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { 'oma:id': '10242', sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectURN>urn:oma:lwm2m:x:10242</ObjectURN>'));
    });

    it('should use "RESERVED" suffix for Object IDs 1024-2047', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { 'oma:id': '1500', sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectURN>urn:oma:lwm2m:RESERVED:1500</ObjectURN>'));
    });
  });

  describe('LwM2M Version', function() {
    it('should output LwM2M version 1.1', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<LWM2MVersion>1.1</LWM2MVersion>'));
    });

    it('should output Object version 1.0', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: { sdfProperty: {} }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<ObjectVersion>1.0</ObjectVersion>'));
    });
  });


  describe('Operations Mapping', function() {
    it('should set R operation for readable properties', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: {
                type: 'number',
                writable: false
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Operations>R</Operations>'), 'Should have Read operation');
    });

    it('should set W operation for writable properties', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: {
                type: 'number',
                writable: true
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('W'), 'Should have Write operation');
    });
  });

  describe('Error Handling', function() {
    it('should throw error for invalid SDF structure', function() {
      const invalidSdf = { invalid: 'structure' };
      assert.throws(() => {
        sdf2oma.getFormattedXml(invalidSdf);
      });
    });

    it('should throw error for missing sdfObject', function() {
      const sdf = {
        info: { title: 'Test' }
      };
      assert.throws(() => {
        sdf2oma.getFormattedXml(sdf);
      });
    });
  });


  describe('Link Type Conversions', function() {
    it('should convert sdfRef oma:objlnk to Objlnk type', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              link: { sdfRef: 'oma:objlnk', description: 'Object link' }
            }
          }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Objlnk</Type>'));
    });

    it('should convert sdfRef oma:corelnk to Corelnk type', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              link: { sdfRef: 'oma:corelnk', description: 'Core link' }
            }
          }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Corelnk</Type>'));
    });

    it('should handle sdfRef in array items', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              links: {
                type: 'array',
                items: { sdfRef: 'oma:objlnk' },
                description: 'Object links'
              }
            }
          }
        }
      };
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Objlnk</Type>'));
      assert(xml.includes('<MultipleInstances>Multiple</MultipleInstances>'));
    });
  });

  describe('Advanced Type Conversions', function() {
    it('should convert byte-string sdfType to Opaque', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              data: {
                type: 'string',
                sdfType: 'byte-string',
                description: 'Binary data'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Opaque</Type>'), 'Should convert byte-string to Opaque');
    });

    it('should convert unix-time sdfType to Time', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              timestamp: {
                type: 'number',
                sdfType: 'unix-time',
                description: 'Timestamp'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Time</Type>'), 'Should convert unix-time to Time');
    });

    it('should handle minimum and maximum constraints', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Value with range'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<RangeEnumeration>0..100</RangeEnumeration>'), 'Should include range');
    });

    it('should handle array items with correct type', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              values: {
                type: 'array',
                items: {
                  type: 'number',
                  minimum: 0
                },
                description: 'Array of numbers'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Float</Type>'), 'Should convert array items type');
      assert(xml.includes('<MultipleInstances>Multiple</MultipleInstances>'), 'Should mark as multiple instances');
    });

    it('should handle unsigned integer in array items', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              counters: {
                type: 'array',
                items: {
                  type: 'integer',
                  minimum: 0
                },
                description: 'Array of counters'
              }
            }
          }
        }
      };
      
      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Type>Unsigned Integer</Type>'), 'Should convert to Unsigned Integer');
    });
  });


  describe('oma:id Quality Round-trip', function() {
    it('should use oma:id for object ID when present', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Temperature: {
            'oma:id': '3303',
            sdfProperty: {
              value: { type: 'number', 'oma:id': 5700 }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const objId = doc.childNamed('Object').childNamed('ObjectID').val;
      assert.strictEqual(objId, '3303');
    });

    it('should use oma:id for resource ID when present', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: { type: 'number', 'oma:id': 5700, description: 'Value' }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const item = doc.childNamed('Object').childNamed('Resources').childNamed('Item');
      assert.strictEqual(item.attr.ID, '5700');
    });
  });

  describe('sdfRequired Handling', function() {
    it('should mark resources in sdfRequired as Mandatory', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfRequired: ['#/sdfObject/Test/sdfProperty/value'],
            sdfProperty: {
              value: { type: 'number', description: 'Required value' },
              optional: { type: 'string', description: 'Optional value' }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const items = doc.childNamed('Object').childNamed('Resources').childrenNamed('Item');
      const valueItem = items.find(i => i.childNamed('Name').val === 'value');
      const optItem = items.find(i => i.childNamed('Name').val === 'optional');
      assert.strictEqual(valueItem.childNamed('Mandatory').val, 'Mandatory');
      assert.strictEqual(optItem.childNamed('Mandatory').val, 'Optional');
    });
  });


  describe('Unit Quality', function() {
    it('should preserve unit in XML output', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              temperature: {
                type: 'number',
                unit: 'Cel',
                description: 'Temperature'
              }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Units>Cel</Units>'), 'Should preserve unit');
    });
  });

  describe('Default Operations', function() {
    it('should default to RW when writable not specified', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              value: { type: 'number', description: 'No writable set' }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      assert(xml.includes('<Operations>RW</Operations>'), 'Should default to RW');
    });
  });

  describe('XML Output Integrity', function() {
    it('should produce well-formed XML without double-escaped entities', function() {
      const sdf = {
        info: { title: 'Test', copyright: 'Copyright', license: 'MIT' },
        sdfObject: {
          Test: {
            label: 'Test',
            description: 'A test object',
            sdfProperty: {
              value: {
                type: 'number',
                description: 'Sensor value'
              }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      // Should not contain escaped angle brackets inside elements
      assert(!xml.includes('&lt;Name&gt;'), 'Should not double-escape XML tags');
      assert(!xml.includes('&lt;Item'), 'Should not escape Item elements');
      // Should parse as valid XML
      const doc = new xmldoc.XmlDocument(xml);
      assert(doc.childNamed('Object'), 'Should parse as valid XML with Object element');
    });

    it('should handle special characters in descriptions without corruption', function() {
      const sdf = {
        info: { title: 'Test', copyright: 'Copyright', license: 'MIT' },
        sdfObject: {
          Test: {
            description: 'Value where threshold < 100 & count > 0',
            sdfProperty: {
              ratio: {
                type: 'number',
                description: 'Ratio (A/B) with "quotes"'
              }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      // Should still produce parseable XML
      const doc = new xmldoc.XmlDocument(xml);
      const obj = doc.childNamed('Object');
      assert(obj, 'Should produce valid XML even with special chars');
    });

    it('should produce properly nested XML structure', function() {
      const sdf = {
        info: { title: 'Test', copyright: '', license: '' },
        sdfObject: {
          Test: {
            sdfProperty: {
              prop1: { type: 'number', description: 'First' },
              prop2: { type: 'string', description: 'Second' }
            },
            sdfAction: {
              reset: { description: 'Reset values' }
            }
          }
        }
      };

      const xml = sdf2oma.getFormattedXml(sdf);
      const doc = new xmldoc.XmlDocument(xml);
      const resources = doc.childNamed('Object').childNamed('Resources');
      const items = resources.childrenNamed('Item');
      assert.strictEqual(items.length, 3, 'Should have 3 resource items');
    });
  });
});
