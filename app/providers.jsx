'use client';
import React from 'react';
import { MotionPreferences } from '../components/shared/motion-preferences';
import WorkspaceGuard from '../components/shared/workspace-guard';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SessionProvider, useSession } from 'next-auth/react';
import { PreferencesProvider, PeopleNames } from '../components/shell/preferences';
import AppShell from '../components/shell/app-shell';
import { BootLoader } from '../components/loading/loaders';
import { SessionTransitionProvider } from '../components/loading/session-transition';
function QueryScope({ children }) {
  const [client] = React.useState(() => new QueryClient());
  React.useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
// Names of the organization's people for every page; refreshed every few minutes.
function People({ signedIn, children }) {
  const { data } = useQuery({
    queryKey: ['people'],
    enabled: signedIn,
    staleTime: 300000,
    refetchInterval: 300000,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/people', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Unable to load names');
      return (await response.json()).people;
    },
  });
  return <PeopleNames people={data}>{children}</PeopleNames>;
}
function SessionQueries({ children }) {
  const { data, status } = useSession();
  if (status === 'loading') return <BootLoader />;
  return <QueryScope key={`${data?.user?.id || 'anonymous'}:${data?.user?.organizationId || 'none'}:${data?.user?.role || ''}:${data?.user?.workArea || ''}`}><People signedIn={Boolean(data?.user)}><AppShell><WorkspaceGuard>{children}</WorkspaceGuard></AppShell></People></QueryScope>;
}
export default function Providers({ children, locale, messages, theme }) {
  return <PreferencesProvider initialLocale={locale} initialMessages={messages} initialTheme={theme}><MotionPreferences><SessionProvider refetchInterval={30} refetchOnWindowFocus><SessionTransitionProvider><SessionQueries>{children}</SessionQueries></SessionTransitionProvider></SessionProvider></MotionPreferences></PreferencesProvider>;
}
