import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from '@/pages/Reports';

interface ExportButtonsProps {
  reportType: string;
  filters: ReportFilters;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  reportType,
  filters
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      const exportData = {
        reportType,
        exportType: 'csv',
        filters: {
          ...filters,
          fromDate: format(filters.fromDate, 'yyyy-MM-dd'),
          toDate: format(filters.toDate, 'yyyy-MM-dd')
        }
      };

      const { data, error } = await supabase.functions.invoke('generate-export', {
        body: exportData
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data.content], {
        type: 'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `${reportType.replace('-', ' ')} exported as CSV`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating the export. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="text-xs"
    >
      {isExporting ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Download className="h-3 w-3 mr-1" />
      )}
      {isExporting ? 'Downloading...' : 'Download'}
    </Button>
  );
};