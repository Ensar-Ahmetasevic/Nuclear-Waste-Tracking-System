import { requireWorkspace } from '@/lib/server/workspace-page';
export default async function Layout({ children }) {
  await requireWorkspace('SHIPPING', true);
  return children;
}
