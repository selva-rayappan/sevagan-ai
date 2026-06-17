# Prompt: Create UI Component / Page

Use this prompt when adding a new page or component to the Next.js admin dashboard.

---

## Prompt Template

```
Create the [PAGE/COMPONENT_NAME] for the Sevagan admin dashboard.

Location: frontend/src/app/(admin)/[route]/page.tsx
           OR
           frontend/src/components/[ComponentName].tsx

Requirements:
[Describe what the page/component should display and do]

Data source:
- API endpoint: GET /api/v1/[resource]
- Use frontend/src/lib/api.ts for all HTTP calls
- Handle loading, error, and empty states

Design constraints:
- TailwindCSS only — no inline styles, no CSS modules
- Use `cn()` (clsx + tailwind-merge) for conditional classes
- lucide-react for icons
- @tanstack/react-table for data tables
- Mark as "use client" only if the component uses state/events
- Server component by default

If it's a data table:
- Columns defined as ColumnDef<T>[]
- Pagination and sorting handled by TanStack Table
- Use the existing table wrapper pattern from other admin pages
```

---

## Admin Layout

All admin pages live under `frontend/src/app/(admin)/` and inherit the admin shell layout from `frontend/src/app/(admin)/layout.tsx`.

## API Client Usage

```typescript
// frontend/src/lib/api.ts
import { api } from '@/lib/api';

const jobs = await api.get<Job[]>('/jobs');
const job = await api.post<Job>('/jobs', { ... });
```

## Common Patterns

```typescript
// Server component with data fetch
export default async function JobsPage() {
  const jobs = await api.get<Job[]>('/jobs');
  return <JobsTable jobs={jobs} />;
}

// Client component with local state
'use client';
export function JobsFilter({ onFilter }: Props) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  // ...
}
```
