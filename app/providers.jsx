'use client';
import React from 'react';
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
  return <QueryScope key={`${data?.user?.id || 'anonymous'}:${data?.user?.organizationId || 'none'}`}>{children}</QueryScope>;
}
export default function Providers({ children }) {
  return <SessionProvider><SessionQueries>{children}</SessionQueries></SessionProvider>;
}
