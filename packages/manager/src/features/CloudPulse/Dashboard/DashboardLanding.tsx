import { Paper } from '@mui/material';
import * as React from 'react';

import { CircleProgress } from 'src/components/CircleProgress';

import { GlobalFilters } from '../Overview/GlobalFilters';
import { loadUserPreference } from '../Utils/UserPreference';

import type { FiltersObject } from '../Overview/GlobalFilters';

export const DashboardLanding = () => {
  const [isPreferenceLoaded, setIsPreferenceLoaded] = React.useState<boolean>(
    false
  );

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onFilterChange = React.useCallback((_filters: FiltersObject) => { }, []);

  // Fetch the saved user preference when this component rendered initially
  React.useEffect(() => {
    const fetchUserPreference = async () => {
      await loadUserPreference();
      setIsPreferenceLoaded(true);
    };

    fetchUserPreference();
  }, []);

  if (!isPreferenceLoaded) {
    return <CircleProgress />;
  }

  return (
    <Paper>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '100%' }}>
          <GlobalFilters handleAnyFilterChange={onFilterChange}></GlobalFilters>
        </div>
      </div>
    </Paper>
  );
};
