// TEMP STUB — will be replaced in Task 9
import type { ReactNode } from 'react';
interface EmptyStateGuardProps { children: ReactNode; onNavigateToLoad: () => void; }
export default function EmptyStateGuard({ children }: EmptyStateGuardProps) { return <>{children}</>; }
