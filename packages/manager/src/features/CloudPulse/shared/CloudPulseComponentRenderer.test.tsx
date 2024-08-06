import { Grid } from '@mui/material';
import React from 'react';

import { renderWithTheme } from 'src/utilities/testHelpers';

import RenderComponent from '../shared/CloudPulseComponentRenderer';
import {
  getRegionProperties,
  getResourcesProperties,
} from '../Utils/FilterBuilder';
import { FILTER_CONFIG } from '../Utils/FilterConfig';

const linodeFilterConfig = FILTER_CONFIG.get('linode');
const DASHBOARD = 'Test Metrics Dashboard';

describe('ComponentRenderer component tests', () => {
  it('it should render provided region filter in props', () => {
    const regionProps = linodeFilterConfig?.filters.find(
      (filter) => filter.configuration.filterKey == 'region'
    );

    const mockDashboard = {
      created: new Date().toDateString(),
      id: 1,
      label: DASHBOARD,
      service_type: 'linode',
      time_duration: { unit: 'min', value: 30 },
      updated: new Date().toDateString(),
      widgets: [],
    };

    const { getByPlaceholderText } = renderWithTheme(
      <Grid item sx={{ marginLeft: 2 }} xs>
        {RenderComponent({
          componentKey: 'region',
          componentProps: {
            ...getRegionProperties(
              {
                config: regionProps!,
                dashboard: mockDashboard,
                isServiceAnalyticsIntegration: false,
              },
              vi.fn()
            ),
          },
          key: 'region',
        })}
      </Grid>
    );

    expect(getByPlaceholderText('Select a Region')).toBeDefined();
  }),
    it('it should render provided resource filter in props', () => {
      const resourceProps = linodeFilterConfig?.filters.find(
        (filter) => filter.configuration.filterKey == 'resource_id'
      );
      const mockDashboard = {
        created: new Date().toDateString(),
        id: 1,
        label: DASHBOARD,
        service_type: 'linode',
        time_duration: { unit: 'min', value: 30 },
        updated: new Date().toDateString(),
        widgets: [],
      };
      const { getByPlaceholderText } = renderWithTheme(
        <Grid item key={'resources'} sx={{ marginLeft: 2 }} xs>
          {RenderComponent({
            componentKey: 'resource_id',
            componentProps: {
              ...getResourcesProperties(
                {
                  config: resourceProps!,
                  dashboard: mockDashboard,
                  dependentFilters: { region: 'us-east' },
                  isServiceAnalyticsIntegration: false,
                },
                vi.fn()
              ),
            },
            key: 'resource_id',
          })}
        </Grid>
      );
      expect(getByPlaceholderText('Select Resources')).toBeDefined();
    });
});
