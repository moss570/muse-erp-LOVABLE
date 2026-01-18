import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, startOfMonth, endOfMonth, format, differenceInDays, parseISO } from 'date-fns';
import type { CapaType, CapaSeverity } from '@/types/capa';

// ============================================
// PARETO CHART DATA
// ============================================

export interface ParetoDataPoint {
  type: CapaType;
  label: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export function useCapaParetoData(params: {
  dateFrom?: string;
  dateTo?: string;
  status?: 'all' | 'open' | 'closed';
} = {}) {
  return useQuery({
    queryKey: ['capa-pareto', params],
    queryFn: async () => {
      let query = supabase
        .from('corrective_actions')
        .select('capa_type, status');

      // Apply date filters
      if (params.dateFrom) {
        query = query.gte('created_at', params.dateFrom);
      }
      if (params.dateTo) {
        query = query.lte('created_at', params.dateTo);
      }

      // Filter by status
      if (params.status === 'open') {
        query = query.not('status', 'in', '("closed","cancelled")');
      } else if (params.status === 'closed') {
        query = query.eq('status', 'closed');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count by type
      const typeCounts = (data || []).reduce((acc, capa) => {
        acc[capa.capa_type] = (acc[capa.capa_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Type labels for display
      const typeLabels: Record<CapaType, string> = {
        supplier: 'Supplier',
        equipment: 'Equipment',
        material: 'Material',
        product: 'Product',
        facility: 'Facility',
        process: 'Process',
        employee: 'Employee',
        sanitation: 'Sanitation',
        sop_non_compliance: 'SOP Non-Compliance',
        labeling: 'Labeling',
        other: 'Other',
      };

      // Sort by count descending
      const sortedTypes = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([type]) => type as CapaType);

      const total = data?.length || 0;
      let cumulative = 0;

      const paretoData: ParetoDataPoint[] = sortedTypes.map(type => {
        const count = typeCounts[type];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        cumulative += percentage;

        return {
          type,
          label: typeLabels[type] || type,
          count,
          percentage: Math.round(percentage * 10) / 10,
          cumulativePercentage: Math.round(cumulative * 10) / 10,
        };
      });

      return {
        data: paretoData,
        total,
        // Find the types that make up 80% (for highlighting)
        eightyPercentTypes: paretoData
          .filter(d => d.cumulativePercentage <= 80 || d.cumulativePercentage - d.percentage < 80)
          .map(d => d.type),
      };
    },
  });
}

// ============================================
// OPENED VS CLOSED TREND DATA
// ============================================

export interface TrendDataPoint {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2025" format
  opened: number;
  closed: number;
  netChange: number; // opened - closed
  cumulativeOpen: number; // running total of open CAPAs
}

export function useCapaTrendData(params: {
  months?: number; // How many months to look back (default 12)
} = {}) {
  const monthsBack = params.months || 12;

  return useQuery({
    queryKey: ['capa-trend', monthsBack],
    queryFn: async () => {
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, monthsBack - 1));

      // Get all CAPAs created in the date range
      const { data: createdData, error: createdError } = await supabase
        .from('corrective_actions')
        .select('id, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (createdError) throw createdError;

      // Get all CAPAs closed in the date range
      const { data: closedData, error: closedError } = await supabase
        .from('corrective_actions')
        .select('id, closed_at')
        .not('closed_at', 'is', null)
        .gte('closed_at', startDate.toISOString())
        .lte('closed_at', endDate.toISOString());

      if (closedError) throw closedError;

      // Get count of CAPAs that were open before the start date (for cumulative calculation)
      const { count: preExistingOpen, error: preError } = await supabase
        .from('corrective_actions')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', startDate.toISOString())
        .or('closed_at.is.null,closed_at.gte.' + startDate.toISOString());

      if (preError) throw preError;

      // Build monthly buckets
      const monthlyData: Record<string, { opened: number; closed: number }> = {};
      
      // Initialize all months
      for (let i = 0; i < monthsBack; i++) {
        const monthDate = subMonths(endDate, monthsBack - 1 - i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthlyData[monthKey] = { opened: 0, closed: 0 };
      }

      // Count opened per month
      (createdData || []).forEach(capa => {
        const monthKey = format(parseISO(capa.created_at), 'yyyy-MM');
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].opened++;
        }
      });

      // Count closed per month
      (closedData || []).forEach(capa => {
        if (capa.closed_at) {
          const monthKey = format(parseISO(capa.closed_at), 'yyyy-MM');
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].closed++;
          }
        }
      });

      // Convert to array and calculate cumulative
      let cumulativeOpen = preExistingOpen || 0;
      const trendData: TrendDataPoint[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => {
          cumulativeOpen += data.opened - data.closed;
          return {
            month,
            monthLabel: format(parseISO(month + '-01'), 'MMM yyyy'),
            opened: data.opened,
            closed: data.closed,
            netChange: data.opened - data.closed,
            cumulativeOpen: Math.max(0, cumulativeOpen),
          };
        });

      // Calculate summary stats
      const totalOpened = trendData.reduce((sum, d) => sum + d.opened, 0);
      const totalClosed = trendData.reduce((sum, d) => sum + d.closed, 0);

      return {
        data: trendData,
        summary: {
          totalOpened,
          totalClosed,
          netChange: totalOpened - totalClosed,
          averageOpenedPerMonth: Math.round((totalOpened / monthsBack) * 10) / 10,
          averageClosedPerMonth: Math.round((totalClosed / monthsBack) * 10) / 10,
          currentOpenBacklog: trendData[trendData.length - 1]?.cumulativeOpen || 0,
        },
      };
    },
  });
}

// ============================================
// MEAN TIME TO CLOSURE (MTTC)
// ============================================

export interface MTTCDataPoint {
  category: string;
  categoryType: 'severity' | 'type' | 'overall';
  count: number; // Number of closed CAPAs
  totalDays: number;
  meanDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  targetDays?: number; // From severity settings
  onTimePercentage: number; // % closed within target
}

export function useCapaMTTCData(params: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'severity' | 'type' | 'both';
} = {}) {
  const groupBy = params.groupBy || 'both';

  return useQuery({
    queryKey: ['capa-mttc', params],
    queryFn: async () => {
      // Get closed CAPAs with their closure times
      let query = supabase
        .from('corrective_actions')
        .select('id, capa_type, severity, created_at, closed_at, corrective_action_due_date')
        .eq('status', 'closed')
        .not('closed_at', 'is', null);

      if (params.dateFrom) {
        query = query.gte('closed_at', params.dateFrom);
      }
      if (params.dateTo) {
        query = query.lte('closed_at', params.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get severity settings for target days
      const { data: severitySettings } = await supabase
        .from('capa_severity_settings')
        .select('severity, corrective_action_days, verification_days, effectiveness_review_days');

      const targetDaysMap: Record<string, number> = {};
      (severitySettings || []).forEach(s => {
        // Total target = corrective action + verification + effectiveness review
        targetDaysMap[s.severity] = s.corrective_action_days + s.verification_days + s.effectiveness_review_days;
      });

      // Calculate days to close for each CAPA
      const capasWithDays = (data || []).map(capa => {
        const createdAt = parseISO(capa.created_at);
        const closedAt = parseISO(capa.closed_at!);
        const daysToClose = differenceInDays(closedAt, createdAt);
        const targetDays = targetDaysMap[capa.severity] || 90;
        const onTime = daysToClose <= targetDays;

        return {
          ...capa,
          daysToClose,
          targetDays,
          onTime,
        };
      });

      // Helper function to calculate stats for a group
      const calculateStats = (
        capas: typeof capasWithDays,
        category: string,
        categoryType: 'severity' | 'type' | 'overall',
        targetDays?: number
      ): MTTCDataPoint => {
        if (capas.length === 0) {
          return {
            category,
            categoryType,
            count: 0,
            totalDays: 0,
            meanDays: 0,
            medianDays: 0,
            minDays: 0,
            maxDays: 0,
            targetDays,
            onTimePercentage: 0,
          };
        }

        const days = capas.map(c => c.daysToClose).sort((a, b) => a - b);
        const totalDays = days.reduce((sum, d) => sum + d, 0);
        const onTimeCount = capas.filter(c => c.onTime).length;

        return {
          category,
          categoryType,
          count: capas.length,
          totalDays,
          meanDays: Math.round((totalDays / capas.length) * 10) / 10,
          medianDays: days[Math.floor(days.length / 2)],
          minDays: Math.min(...days),
          maxDays: Math.max(...days),
          targetDays,
          onTimePercentage: Math.round((onTimeCount / capas.length) * 100),
        };
      };

      const results: MTTCDataPoint[] = [];

      // Overall stats
      results.push(calculateStats(capasWithDays, 'Overall', 'overall'));

      // By severity
      if (groupBy === 'severity' || groupBy === 'both') {
        const severities: CapaSeverity[] = ['critical', 'major', 'minor'];
        const severityLabels: Record<CapaSeverity, string> = {
          critical: 'Critical',
          major: 'Major',
          minor: 'Minor',
        };

        severities.forEach(severity => {
          const filtered = capasWithDays.filter(c => c.severity === severity);
          results.push(calculateStats(
            filtered,
            severityLabels[severity],
            'severity',
            targetDaysMap[severity]
          ));
        });
      }

      // By type
      if (groupBy === 'type' || groupBy === 'both') {
        const typeLabels: Record<CapaType, string> = {
          supplier: 'Supplier',
          equipment: 'Equipment',
          material: 'Material',
          product: 'Product',
          facility: 'Facility',
          process: 'Process',
          employee: 'Employee',
          sanitation: 'Sanitation',
          sop_non_compliance: 'SOP Non-Compliance',
          labeling: 'Labeling',
          other: 'Other',
        };

        // Only include types that have data
        const typesWithData = [...new Set(capasWithDays.map(c => c.capa_type))];
        
        typesWithData.forEach(type => {
          const filtered = capasWithDays.filter(c => c.capa_type === type);
          if (filtered.length > 0) {
            results.push(calculateStats(filtered, typeLabels[type as CapaType] || type, 'type'));
          }
        });
      }

      return {
        data: results,
        overall: results.find(r => r.categoryType === 'overall')!,
        bySeverity: results.filter(r => r.categoryType === 'severity'),
        byType: results.filter(r => r.categoryType === 'type'),
      };
    },
  });
}

// ============================================
// COMBINED DASHBOARD DATA
// ============================================

export function useCapaAnalyticsDashboard(params: {
  months?: number;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const paretoQuery = useCapaParetoData({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const trendQuery = useCapaTrendData({
    months: params.months || 12,
  });

  const mttcQuery = useCapaMTTCData({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    groupBy: 'both',
  });

  return {
    pareto: paretoQuery,
    trend: trendQuery,
    mttc: mttcQuery,
    isLoading: paretoQuery.isLoading || trendQuery.isLoading || mttcQuery.isLoading,
    isError: paretoQuery.isError || trendQuery.isError || mttcQuery.isError,
  };
}
