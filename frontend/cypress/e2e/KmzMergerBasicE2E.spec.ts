/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger E2E", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Merges KMZ files in normal mode and compares the output", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()

    // Wait longer for page to fully load
    cy.wait(2000)

    // 2. Upload the test files
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/merger_1.kmz',
      'cypress/fixtures/test-data/merger_2.kmz',
      'cypress/fixtures/test-data/merger_3.kmz'
    ], {
      force: true
    })

    cy.wait(1000) // wait for processing & upload to complete

    // 3. Click the "Go!" button (Merge)
    cy.contains("Go!").click()

    // Wait longer for download
    cy.wait(1000)

    cy.task('log', 'Starting file comparison...')

    // Create a proper promise chain for file processing
    cy.readFile("cypress/downloads/merged.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist')
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`)

        // Read the expected file
        return cy.fixture("test-data/merged.kmz", null)
          .then(expectedFileContent => {
            if (!expectedFileContent) {
              throw new Error('Expected file is empty or does not exist')
            }
            cy.task('log', `Expected file size: ${expectedFileContent.byteLength} bytes`)

            // Safe access to JSZip - check it exists before using
            if (typeof JSZip !== 'function' && typeof JSZip.loadAsync !== 'function') {
              throw new Error(`JSZip not properly loaded: ${typeof JSZip}`)
            }

            // Create promises for both zip files
            const zipPromises = [
              JSZip.loadAsync(outputFileContent),
              JSZip.loadAsync(expectedFileContent)
            ]

            // Wait for both zip objects to be loaded
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
