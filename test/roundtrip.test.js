/**
 * Round-trip conversion tests
 * Tests that converting OMA->SDF->OMA preserves data integrity
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const xmldoc = require('xmldoc');
const oma2sdf = require('../oma2sdf/oma2sdf');
const sdf2oma = require('../sdf2oma/sdf2oma');

describe('Round-trip Conversion Tests', function() {
  
  describe('OMA -> SDF -> OMA', function() {
    it('should preserve object name through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const originalDoc = new xmldoc.XmlDocument(originalXml);
      const originalName = originalDoc.childNamed('Object').childNamed('Name').val;
      
      // Convert to SDF
      const sdf = oma2sdf.createSdf(originalXml, false, false);
      
      // Convert back to OMA
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      const convertedDoc = new xmldoc.XmlDocument(convertedXml);
      const convertedName = convertedDoc.childNamed('Object').childNamed('Name').val;
      
      assert.strictEqual(convertedName, originalName);
    });

    it('should preserve object description through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const originalDoc = new xmldoc.XmlDocument(originalXml);
      const originalDesc = originalDoc.childNamed('Object').childNamed('Description1').val;
      
      const sdf = oma2sdf.createSdf(originalXml, false, false);
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      const convertedDoc = new xmldoc.XmlDocument(convertedXml);
      const convertedDesc = convertedDoc.childNamed('Object').childNamed('Description1').val;
      
      assert.strictEqual(convertedDesc, originalDesc);
    });

    it('should preserve resource types through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      
      const sdf = oma2sdf.createSdf(originalXml, false, false);
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      
      // Check that Float types are preserved
      assert(convertedXml.includes('<Type>Float</Type>'));
      assert(convertedXml.includes('<Type>String</Type>'));
    });
  });

  describe('Data Integrity', function() {
    it('should maintain resource count through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const originalDoc = new xmldoc.XmlDocument(originalXml);
      const originalResources = originalDoc.childNamed('Object')
        .childNamed('Resources').children.filter(c => c.type !== 'text');
      
      const sdf = oma2sdf.createSdf(originalXml, false, false);
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      const convertedDoc = new xmldoc.XmlDocument(convertedXml);
      const convertedResources = convertedDoc.childNamed('Object')
        .childNamed('Resources').children.filter(c => c.type !== 'text');
      
      assert.strictEqual(convertedResources.length, originalResources.length);
    });

    it('should preserve object ID through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const originalDoc = new xmldoc.XmlDocument(originalXml);
      const originalId = originalDoc.childNamed('Object').childNamed('ObjectID').val;

      const sdf = oma2sdf.createSdf(originalXml, false, false);
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      const convertedDoc = new xmldoc.XmlDocument(convertedXml);
      const convertedId = convertedDoc.childNamed('Object').childNamed('ObjectID').val;

      assert.strictEqual(convertedId, originalId);
    });

    it('should preserve resource IDs through round-trip', function() {
      const originalXml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const originalDoc = new xmldoc.XmlDocument(originalXml);
      const originalItems = originalDoc.childNamed('Object')
        .childNamed('Resources').childrenNamed('Item');
      const originalIds = originalItems.map(i => i.attr.ID).sort();

      const sdf = oma2sdf.createSdf(originalXml, false, false);
      const convertedXml = sdf2oma.getFormattedXml(sdf);
      const convertedDoc = new xmldoc.XmlDocument(convertedXml);
      const convertedItems = convertedDoc.childNamed('Object')
        .childNamed('Resources').childrenNamed('Item');
      const convertedIds = convertedItems.map(i => i.attr.ID).sort();

      assert.deepStrictEqual(convertedIds, originalIds);
    });
  });
});
