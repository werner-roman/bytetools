/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Reverse E2E", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Reverses a KMZ file and compares the output", () => {
    // 1. Navigate to the KMZ Reverse tool
    cy.contains("KMZ Reverse").click()

    // Wait longer for page to fully load
    cy.wait(2000)

    // Debug - log all input elements on page
    cy.get('input[type="file"]').then($elements => {
      cy.task('log', `Found ${$elements.length} file inputs`)
    })

    // Use a more general selector
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/reverse_1.kmz',
      'cypress/fixtures/test-data/reverse_2.kmz',
      'cypress/fixtures/test-data/reverse_3.kmz',
      'cypress/fixtures/test-data/reverse_4.kmz',
      'cypress/fixtures/test-data/reverse_5.kmz',
      'cypress/fixtures/test-data/reverse_6.kmz',
      'cypress/fixtures/test-data/reverse_7.kmz',
      'cypress/fixtures/test-data/reverse_8.kmz',
    ], {
      force: true
    })

    cy.wait(1000)

    // 3. Click the "Go!" button (Reverse)
    cy.contains("Go!").click()

    cy.wait(1000)
    
    cy.readFile("cypress/downloads/reversed_reverse_8.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist')
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`)
        
        return cy.fixture("test-data/reversed_reverse_8.kmz", null)
          .then(expectedFileContent => {
            if (!expectedFileContent) {
              throw new Error('Expected file is empty or does not exist')
            }
            
            if (typeof JSZip !== 'function' && typeof JSZip.loadAsync !== 'function') {
              throw new Error(`JSZip not properly loaded: ${typeof JSZip}`)
            }
            
            const zipPromises = [
              JSZip.loadAsync(outputFileContent),
              JSZip.loadAsync(expectedFileContent)
            ]
            
            return Promise.all(zipPromises)
          })
      })
      .then(([outputZip, expectedZip]) => {
        // Extract doc.kml from both zips
        const kmlPromises = [
          outputZip.file("doc.kml")?.async("string"),
          expectedZip.file("doc.kml")?.async("string")
        ]
        
        if (!kmlPromises[0] || !kmlPromises[1]) {
          throw new Error("doc.kml not found in one of the zip files")
        }
        
        return Promise.all(kmlPromises)
      })
      .then(([outputKml, expectedKml]) => {
        // Compare the KML contents
        cy.task('log', 'Successfully extracted both KML files')
        expect(outputKml).to.equal(expectedKml)
      })
  })
})
