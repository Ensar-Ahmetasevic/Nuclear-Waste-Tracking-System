import { requireWorkspace } from '@/lib/server/workspace-page';
export default async function Layout({ children }) { await requireWorkspace(null, true); return children; }
