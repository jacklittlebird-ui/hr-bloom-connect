import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Regression test: ensures no department-manager RLS policy ever regresses
 * to a single-department check. A multi-dept manager must see violations,
 * overtime, leaves, attendance, evaluations, etc. for ALL their assigned
 * departments.
 *
 * The DB function `public.audit_dm_multi_dept_policies()` returns one row
 * per offending policy. Zero rows = healthy.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

const hasEnv = Boolean(SUPABASE_URL && SUPABASE_KEY);

describe('RLS: department manager policies cover all assigned departments', () => {
  (hasEnv ? it : it.skip)('no policy uses single-department logic', async () => {
    const client = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    const { data, error } = await client.rpc('audit_dm_multi_dept_policies' as any);
    expect(error).toBeNull();
    const offenders = (data as Array<{ table_name: string; policy_name: string; expression: string }>) || [];
    if (offenders.length > 0) {
      // Make the failure message actionable
      const list = offenders.map(o => `- ${o.table_name} :: ${o.policy_name}`).join('\n');
      throw new Error(
        `Found ${offenders.length} dept-manager RLS policy(ies) still using single-department logic. ` +
        `Update each to use get_dm_department_ids(auth.uid()):\n${list}`
      );
    }
    expect(offenders).toEqual([]);
  });
});
