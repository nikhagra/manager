import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import {
  mockCloudPulseJWSToken,
  mockCloudPulseDashboardServicesResponse,
  mockCloudPulseCreateMetrics,
  mockCloudPulseGetDashboards,
  mockCloudPulseGetMetricDefinitions,
  mockCloudPulseServices,
} from 'support/intercepts/cloudpulse';
import { ui } from 'support/ui';
import { widgetDetails } from 'support/constants/widgets';
import { CloudPulseMetricsResponses } from '@src/factories/widget';
import {
  accountFactory,
  dashboardFactory,
  dashboardMetricFactory,
  kubeLinodeFactory,
  linodeFactory,
  regionFactory,
  widgetFactory,
} from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import { mockGetLinodes } from 'support/intercepts/linodes';
import { mockGetUserPreferences } from 'support/intercepts/profile';
import { mockGetRegions } from 'support/intercepts/regions';
import { extendRegion } from 'support/util/regions';
import { CloudPulseMetricsResponse } from '@linode/api-v4';
import { transformData } from 'src/features/CloudPulse/Utils/unitConversion';
import { getMetrics } from 'src/utilities/statMetrics';
const timeRanges = {
  last7Days: 'Last 7 Days',
  last12Hours: 'Last 12 Hours',
  last24Hours: 'Last 24 Hours',
  last30Days: 'Last 30 Days',
  last30Minutes: 'Last 30 Minutes',
};
const y_labels = [
  'system_cpu_utilization_ratio',
  'system_memory_usage_bytes',
  'system_network_io_bytes_total',
  'system_disk_operations_total',
];
const expectedGranularityArray = ['Auto', '1 day', '1 hr', '5 min'];

/**
 * This test ensures that widget titles are displayed correctly on the dashboard.
 * This test suite is dedicated to verifying the functionality and display of widgets on the Cloudpulse dashboard.
 *  It includes:
 * Validating that widgets are correctly loaded and displayed.
 * Ensuring that widget titles and data match the expected values.
 * Verifying that widget settings, such as granularity and aggregation, are applied correctly.
 * Testing widget interactions, including zooming and filtering, to ensure proper behavior.
 * Each test ensures that widgets on the dashboard operate correctly and display accurate information.
 */

const metrics = widgetDetails.linode.metrics;
const widgetLabels: string[] = metrics.map((widget) => widget.title);
const metricsLabels: string[] = metrics.map((widget) => widget.name);
const unit: string[] = metrics.map((widget) => widget.unit);
const dashboard = dashboardFactory.build({
  label: widgetDetails.linode.dashboardName,
  service_type: widgetDetails.linode.service_type,
  widgets: [
    ...widgetLabels.map((label: string, index: number) =>
      widgetFactory.build({
        label,
        y_label: y_labels[index],
        metric: metricsLabels[index],
        unit: unit[index],
      })
    ),
  ],
});

const metricDefinitions = {
  data: [
    ...widgetLabels.map((label, index) =>
      dashboardMetricFactory.build({
        label,
        metric: metricsLabels[index],
        unit: unit[index],
      })
    ),
  ],
};
const mockKubeLinode = kubeLinodeFactory.build();
const mockLinode = linodeFactory.build({
  label: widgetDetails.linode.resource,
  id: mockKubeLinode.instance_id ?? undefined,
});
const mockAccount = accountFactory.build();
const mockRegion = extendRegion(
  regionFactory.build({
    capabilities: ['Linodes'],
    id: 'us-ord',
    label: 'Chicago, IL',
    country: 'us',
  })
);
const responsePayload = CloudPulseMetricsResponses(
  timeRanges.last24Hours,
  '5 min'
);
describe('Dashboard Widget Verification Tests', () => {
  beforeEach(() => {
    mockAppendFeatureFlags({
      aclp: { beta: true, enabled: true },
    }).as('getFeatureFlags');
    mockGetAccount(mockAccount).as('getAccount'); // Enables the account to have capability for Akamai Cloud Pulse
    mockGetLinodes([mockLinode]).as('getLinodes');
    mockCloudPulseGetMetricDefinitions(
      metricDefinitions,
      widgetDetails.linode.service_type
    );
    mockCloudPulseGetDashboards(
      dashboard,
      widgetDetails.linode.service_type
    ).as('dashboard');
    mockCloudPulseServices(widgetDetails.linode.service_type).as('services');
    mockCloudPulseDashboardServicesResponse(dashboard, widgetDetails.linode.id);
    mockCloudPulseJWSToken(widgetDetails.linode.service_type);
    mockCloudPulseCreateMetrics(
      responsePayload,
      widgetDetails.linode.service_type
    ).as('getMetrics');
    mockGetRegions([mockRegion]).as('getRegions');
    mockGetUserPreferences({}).as('getUserPreferences');
    cy.visitWithLogin('monitor/cloudpulse').as('cloudPulsePage');
    cy.get('@cloudPulsePage');

    // Selecting a dashboard from the autocomplete input.
    ui.autocomplete
      .findByLabel('Select a Dashboard')
      .should('be.visible')
      .type(`${widgetDetails.linode.dashboardName}{enter}`)
      .should('be.visible');

    // Select a time duration from the autocomplete input.
    ui.autocomplete
      .findByLabel('Select a Time Duration')
      .should('be.visible')
      .type(`${timeRanges.last24Hours}{enter}`)
      .should('be.visible');

    // Select a region from the dropdown.
    ui.regionSelect
      .find()
      .click()
      .type(`${widgetDetails.linode.region}{enter}`);

    // Select a resource from the autocomplete input.
    ui.autocomplete
      .findByLabel('Select a Resource')
      .should('be.visible')
      .type(`${widgetDetails.linode.resource}{enter}`)
      .click();
    cy.findByText(widgetDetails.linode.resource).should('be.visible');

    // Verify that the titles of the widgets are displayed correctly, including the unit.
    metrics.forEach((testData) => {
      const widgetSelector = `[data-qa-widget-header="${testData.title}"]`;
      cy.get(widgetSelector)
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.equal(
            `${testData.title} (${testData.unit.trim()})`
          );
        });
    });
  });

  it('should allow users to select their desired granularity and see the most recent data from the API reflected in the graph', () => {
    // validate the widget level granularity selection and its metrics
    for (const testData of metrics) {
      cy.wait(7000); //maintaining the wait since page flicker and rendering
      const widgetSelector = `[data-qa-widget="${testData.title}"]`;

      cy.get(widgetSelector)
        .should('be.visible')
        .first()
        .within(() => {
          // check for all available granularity in popper
          ui.autocomplete
            .findByLabel('Select an Interval')
            .should('be.visible')
            .click();

          expectedGranularityArray.forEach((option) => {
            ui.autocompletePopper.findByTitle(option).should('exist');
          });

          //find the interval component and select the expected granularity
          ui.autocomplete
            .findByLabel('Select an Interval')
            .should('be.visible')
            .type(`${testData.expectedGranularity}{enter}`); //type expected granularity

          //check if the API call is made correctly with time granularity value selected
          cy.wait('@getMetrics').then((interception) => {
            expect(interception)
              .to.have.property('response')
              .with.property('statusCode', 200);
            expect(testData.expectedGranularity).to.include(
              interception.request.body.time_granularity.value
            );
          });

          //validate the widget linegrah is present
          cy.findByTestId('linegraph-wrapper')
            .should('be.visible')
            .find('tbody tr')
            .each(($tr) => {
              const cells = $tr
                .find('td')
                .map((i, el) => {
                  const text = Cypress.$(el).text().trim();
                  return text.replace(/^\s*\([^)]+\)/, '');
                })
                .get();
              const [title, actualMax, actualAvg, actualLast] = cells; // the average, max and last present in the widget
              const widgetValues = getWidgetLegendRowValuesFromResponse(
                responsePayload
              ); // the average, max and last from the response payload
              compareWidgetValues(
                // compare both
                {
                  title,
                  max: parseFloat(actualMax),
                  average: parseFloat(actualAvg),
                  last: parseFloat(actualLast),
                },
                widgetValues,
                testData.title
              );
            });
        });
    }
  });

  it('should allow users to select the desired aggregation and view the latest data from the API displayed in the graph', () => {
    for (const testData of metrics) {
      cy.wait(7000); //maintaining the wait since page flicker and rendering
      const widgetSelector = `[data-qa-widget="${testData.title}"]`;

      cy.get(widgetSelector)
        .should('be.visible')
        .first()
        .within(() => {
          mockCloudPulseCreateMetrics(
            responsePayload,
            widgetDetails.linode.service_type
          ).as('getAggregationMetrics');

          //find the interval component and select the expected granularity
          ui.autocomplete
            .findByLabel('Select an Aggregate Function')
            .should('be.visible')
            .type(`${testData.expectedAggregation}{enter}`); //type expected granularity

          //check if the API call is made correctly with time granularity value selected
          cy.wait('@getAggregationMetrics').then((interception) => {
            expect(interception)
              .to.have.property('response')
              .with.property('statusCode', 200);
            // cy.log(JSON.stringify(interception.request.body));
            expect(testData.expectedAggregation).to.equal(
              interception.request.body.aggregate_function
            );
          });

          //validate the widget linegrah is present
          cy.findByTestId('linegraph-wrapper')
            .should('be.visible')
            .find('tbody tr')
            .each(($tr) => {
              const cells = $tr
                .find('td')
                .map((i, el) => {
                  const text = Cypress.$(el).text().trim();
                  return text.replace(/^\s*\([^)]+\)/, '');
                })
                .get();
              const [title, actualMax, actualAvg, actualLast] = cells; // the average, max and last present in the widget
              const widgetValues = getWidgetLegendRowValuesFromResponse(
                responsePayload
              ); // the average, max and last from the response payload
              compareWidgetValues(
                // compare both
                {
                  title,
                  max: parseFloat(actualMax),
                  average: parseFloat(actualAvg),
                  last: parseFloat(actualLast),
                },
                widgetValues,
                testData.title
              );
            });
        });
    }
  });
  it('should trigger the global refresh button and verify the corresponding network calls', () => {
    cy.wait(7000); //maintaining the wait since page flicker and rendering

    // click the global refresh button
    ui.button
      .findByAttribute('aria-label', 'Refresh Dashboard Metrics')
      .should('be.visible')
      .click();

    // validate the API calls are going with intended payload
    cy.wait(['@getMetrics', '@getMetrics', '@getMetrics', '@getMetrics']).then(
      (interceptions) => {
        const interceptionsArray = Array.isArray(interceptions)
          ? interceptions
          : [interceptions];
        interceptionsArray.forEach((interception) => {
          const { body: requestPayload } = interception.request;
          const { metric, relative_time_duration: timeRange } = requestPayload;
          const metricData = metrics.find((data) => data.name === metric);
          if (!metricData) {
            expect.fail(
              'metricData or its expected properties are not defined.'
            );
          }
          const expectedRelativeTimeDuration = timeRange
            ? `Last ${timeRange.value} ${
                ['hour', 'hr'].includes(timeRange.unit.toLowerCase())
                  ? 'Hours'
                  : timeRange.unit
              }`
            : '';
          expect(metric).to.equal(metricData.name);
          expect(expectedRelativeTimeDuration).to.equal(timeRanges.last24Hours);
        });
      }
    );
  });

  it('should zoom in and out of all the widgets', () => {
    // do zoom in and zoom out test on all the widgets
    metrics.forEach((testData) => {
      cy.wait(7000); //maintaining the wait since page flicker and rendering
      cy.get(`[data-qa-widget="${testData.title}"]`).as('widget');
      cy.get('@widget')
        .should('be.visible')
        .within(() => {
          ui.button
            .findByAttribute('aria-label', 'Zoom In')
            .should('be.visible')
            .should('be.enabled')
            .click();
          cy.get('@widget').should('be.visible');
          cy.findByTestId('linegraph-wrapper')
            .as('canvas')
            .should('be.visible')
            .find('tbody tr')
            .each(($tr) => {
              const cells = $tr
                .find('td')
                .map((i, el) => Cypress.$(el).text().trim())
                .get();
              const [title, actualMax, actualAvg, actualLast] = cells;
              const widgetValues = getWidgetLegendRowValuesFromResponse(
                responsePayload
              );
              compareWidgetValues(
                {
                  title,
                  max: parseFloat(actualMax),
                  average: parseFloat(actualAvg),
                  last: parseFloat(actualLast),
                },
                widgetValues,
                testData.title
              );
            });

          // click zoom out and validate the same
          ui.button
            .findByAttribute('aria-label', 'Zoom Out')
            .should('be.visible')
            .should('be.enabled')
            .scrollIntoView()
            .click({ force: true });
          cy.get('@widget').should('be.visible');
          cy.findByTestId('linegraph-wrapper')
            .as('canvas')
            .should('be.visible')
            .find('tbody tr')
            .each(($tr) => {
              const cells = $tr
                .find('td')
                .map((i, el) => Cypress.$(el).text().trim())
                .get();
              const [title, actualMax, actualAvg, actualLast] = cells;
              const widgetValues = getWidgetLegendRowValuesFromResponse(
                responsePayload
              );
              compareWidgetValues(
                {
                  title,
                  max: parseFloat(actualMax),
                  average: parseFloat(actualAvg),
                  last: parseFloat(actualLast),
                },
                widgetValues,
                testData.title
              );
            });
        });
    });
  });
});
/**
 * `verifyWidgetValues` processes and verifies the metric values of a widget from the provided response payload.
 *
 * This method performs the following steps:
 * 1. Transforms the raw data from the response payload into a more manageable format using `transformData`.
 * 2. Extracts key metrics (average, last, and max) from the transformed data using `getMetrics`.
 * 3. Rounds these metrics to two decimal places for accuracy.
 * 4. Returns an object containing the rounded average, last, and max values for further verification or comparison.
 *
 * @param {CloudPulseMetricsResponse} responsePayload - The response payload containing metric data for a widget.
 * @returns {Object} An object with the rounded average, last, and max metric values.
 */
const getWidgetLegendRowValuesFromResponse = (
  responsePayload: CloudPulseMetricsResponse
) => {
  const data = transformData(responsePayload.data.result[0].values, 'Bytes');
  const { average, last, max } = getMetrics(data);
  const roundedAverage = Math.round(average * 100) / 100;
  const roundedLast = Math.round(last * 100) / 100;
  const roundedMax = Math.round(max * 100) / 100;
  return { average: roundedAverage, last: roundedLast, max: roundedMax };
};

/**
 * Compares actual widget values to the expected values and asserts their equality.
 *
 * @param actualValues - The actual values retrieved from the widget, consisting of:
 *   @param actualValues.max - The maximum value shown on the widget.
 *   @param actualValues.average - The average value shown on the widget.
 *   @param actualValues.last - The last or most recent value shown on the widget.
 *
 * @param expectedValues - The expected values that the widget should display, consisting of:
 *   @param expectedValues.max - The expected maximum value.
 *   @param expectedValues.average - The expected average value.
 *   @param expectedValues.last - The expected last or most recent value.
 */

const compareWidgetValues = (
  actualValues: { title: string; max: number; average: number; last: number },
  expectedValues: { max: number; average: number; last: number },
  title: string
) => {
  expect(actualValues.max).to.equal(
    expectedValues.max,
    `Expected ${expectedValues.max} for max, but got ${actualValues.max}`
  );
  expect(actualValues.average).to.equal(
    expectedValues.average,
    `Expected ${expectedValues.average} for average, but got ${actualValues.average}`
  );
  expect(actualValues.last).to.equal(
    expectedValues.last,
    `Expected ${expectedValues.last} for last, but got ${actualValues.last}`
  );
  const extractedTitle = actualValues.title.substring(
    0,
    actualValues.title.indexOf(' ', actualValues.title.indexOf(' ') + 1)
  );
  expect(extractedTitle).to.equal(
    title,
    `Expected ${title} for title ${extractedTitle}`
  );
};
