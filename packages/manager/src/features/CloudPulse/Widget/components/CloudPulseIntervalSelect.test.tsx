import React from 'react';

import { renderWithTheme } from 'src/utilities/testHelpers';

import { CloudPulseIntervalSelect } from './CloudPulseIntervalSelect';

import type { TimeGranularity } from '@linode/api-v4';

describe('Interval select component', () => {
  const intervalSelectionChange = (_selectedInterval: TimeGranularity) => {};

  it('should check for the selected value in interval select dropdown', () => {
    const scrape_interval = '30s';
    const default_interval = { unit: 'min', value: 5 };

    const { getByRole } = renderWithTheme(
      <CloudPulseIntervalSelect
        default_interval={default_interval}
        onIntervalChange={intervalSelectionChange}
        scrape_interval={scrape_interval}
      />
    );

    const dropdown = getByRole('combobox');

    expect(dropdown).toHaveAttribute('value', '5 min');
  });

  // it('should show a warning if default interval is not present in available intervals', () => {
  //   // also checks the working of scrape interval logic
  //   const scrape_interval = '2m';
  //   const default_interval = { unit: 'min', value: 1 };

  //   const { getByText } = renderWithTheme(
  //     <CloudPulseIntervalSelect
  //       default_interval={default_interval}
  //       onIntervalChange={intervalSelectionChange}
  //       scrape_interval={scrape_interval}
  //     />
  //   );

  //   expect(
  //     getByText(
  //       `Invalid interval '${
  //         default_interval?.unit + String(default_interval?.value)
  //       }'`
  //     )
  //   ).toBeInTheDocument();
  // });
});
