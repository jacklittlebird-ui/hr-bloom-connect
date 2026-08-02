import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AlertKey =
  | 'renewals'           // Insurance / contract renewals
  | 'nationalId'         // National ID renewals
  | 'bankData'           // Missing bank data
  | 'missingJob'         // Missing job data
  | 'leaveBalances'      // Leave balances exhausted/low
  | 'unpaidLeaves'       // Unpaid leaves
  | 'penaltyDeductions'; // Penalty deductions

export interface AlertCounts {
  total: number;   // total alerts of this kind
  urgent: number;  // ≤30 days or critical
  expired: number; // overdue / >0 days
}

export type AlertsStatsMap = Record<AlertKey, AlertCounts>;

const EMPTY: AlertCounts = { total: 0, urgent: 0, expired: 0 };

const blankMap: AlertsStatsMap = {
  renewals: EMPTY,
  nationalId: EMPTY,
  bankData: EMPTY,
  missingJob: EMPTY,
  leaveBalances: EMPTY,
  unpaidLeaves: EMPTY,
  penaltyDeductions: EMPTY,
};

const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

/**
 * Lightweight aggregator. Pulls only needed columns and computes counts client-side.
 * Refreshes every 5 minutes, plus on demand via `refresh()`.
 */
export function useAlertsStats() {
  const [stats, setStats] = useState<AlertsStatsMap>(blankMap);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      // leave_balances can exceed the 1000-row API cap → page through it
      const fetchAllBalances = async () => {
        const rows: any[] = [];
        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from('leave_balances')
            .select('employee_id, annual_total, casual_total, sick_total, permissions_total')
            .eq('year', new Date().getFullYear())
            .range(from, from + PAGE - 1);
          if (error || !data) break;
          rows.push(...data);
          if (data.length < PAGE) break;
        }
        return rows;
      };

      const [
        empRes,
        unpaidRes,
        penaltyRes,
        balances,
      ] = await Promise.all([
        supabase
          .from('employees')
          .select(
            'id, social_insurance_end_date, id_expiry_date, bank_account_number, bank_id_number, bank_name, job_title_ar, basic_salary, hire_date, status',
          )
          .eq('status', 'active'),
        supabase
          .from('leave_requests')
          .select('id, leave_type, status, days')
          .eq('leave_type', 'unpaid'),
        supabase
          .from('violations')
          .select('id, status, penalty, date'),
        fetchAllBalances(),
      ]);


      const employees = empRes.data || [];
      const unpaid = unpaidRes.data || [];
      const penalties = penaltyRes.data || [];
      const balances = balRes.data || [];

      // Insurance renewals
      let r_total = 0, r_urgent = 0, r_expired = 0;
      // National ID renewals
      let n_total = 0, n_urgent = 0, n_expired = 0;
      // Missing bank data
      let b_total = 0;
      // Missing job data
      let j_total = 0;

      for (const e of employees) {
        const insDays = daysUntil(e.social_insurance_end_date as string | null);
        if (insDays !== null) {
          if (insDays < 0) { r_total++; r_expired++; }
          else if (insDays <= 60) { r_total++; r_urgent++; }
        }
        const idDays = daysUntil(e.id_expiry_date as string | null);
        if (idDays !== null) {
          if (idDays < 0) { n_total++; n_expired++; }
          else if (idDays <= 90) { n_total++; n_urgent++; }
        }
        if (!e.bank_account_number || !e.bank_id_number || !e.bank_name) b_total++;
        if (!e.job_title_ar || !e.basic_salary || !e.hire_date) j_total++;
      }

      // Leave balances: active employees with 6+ months who have no balance
      // record for the current year (or all totals = 0) — matches the tab list.
      const balanceMap = new Map((balances as any[]).map((b: any) => [b.employee_id, b]));
      const now = Date.now();
      let lb_total = 0, lb_urgent = 0;
      for (const e of employees as any[]) {
        if (!e.hire_date) continue;
        const months = (now - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (months < 6) continue;
        const b = balanceMap.get(e.id);
        const empty = !b || (
          Number(b.annual_total ?? 0) === 0 &&
          Number(b.casual_total ?? 0) === 0 &&
          Number(b.sick_total ?? 0) === 0 &&
          Number(b.permissions_total ?? 0) === 0
        );
        if (empty) { lb_total++; lb_urgent++; }
      }

      const ul_total = unpaid.length;
      const ul_urgent = unpaid.filter((u: any) => u.status === 'pending').length;

      // Penalties pending
      const p_total = penalties.length;
      const p_urgent = penalties.filter((p: any) => p.status === 'pending' || p.status === 'active').length;

      setStats({
        renewals: { total: r_total, urgent: r_urgent, expired: r_expired },
        nationalId: { total: n_total, urgent: n_urgent, expired: n_expired },
        bankData: { total: b_total, urgent: 0, expired: 0 },
        missingJob: { total: j_total, urgent: 0, expired: 0 },
        leaveBalances: { total: lb_total, urgent: lb_urgent, expired: 0 },
        unpaidLeaves: { total: ul_total, urgent: ul_urgent, expired: 0 },
        penaltyDeductions: { total: p_total, urgent: p_urgent, expired: 0 },
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useAlertsStats] failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = window.setInterval(fetchAll, 5 * 60 * 1000); // 5 min
    return () => window.clearInterval(id);
  }, [fetchAll]);

  const summary = useMemo(() => {
    let total = 0, urgent = 0, expired = 0;
    (Object.keys(stats) as AlertKey[]).forEach((k) => {
      total += stats[k].total;
      urgent += stats[k].urgent;
      expired += stats[k].expired;
    });
    return { total, urgent, expired, resolved: 0 };
  }, [stats]);

  return { stats, summary, loading, lastUpdated, refresh: fetchAll };
}
