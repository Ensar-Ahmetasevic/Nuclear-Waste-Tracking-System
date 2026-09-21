'use client';
import React from 'react';
import { MotionPreferences } from '../components/shared/motion-preferences';
import WorkspaceGuard from '../components/shared/workspace-guard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from 'next-auth/react';
function QueryScope({ children }) {
  const [client] = React.useState(() => new QueryClient());
  React.useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function SessionQueries({ children }) {
  const { data, status } = useSession();
  if (status === 'loading') return <p className="p-6" role="status">Loading session…</p>;
  return <QueryScope key={`${data?.user?.id || 'anonymous'}:${data?.user?.organizationId || 'none'}:${data?.user?.role || ''}:${data?.user?.workArea || ''}`}><WorkspaceGuard>{children}</WorkspaceGuard></QueryScope>;
}
export default function Providers({ children }) {
  return <MotionPreferences><SessionProvider refetchInterval={30} refetchOnWindowFocus><SessionQueries>{children}</SessionQueries></SessionProvider></MotionPreferences>;
}
