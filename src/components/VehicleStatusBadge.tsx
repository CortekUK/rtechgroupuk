import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Car, AlertTriangle, CheckCircle, XCircle, ArrowRightLeft } from "lucide-react";

interface VehicleStatusBadgeProps {
  status: string;
  disposalType?: string | null;
  showTooltip?: boolean;
  compact?: boolean;
}

const getDisposalLabel = (disposalType?: string | null): string => {
  switch (disposalType) {
    case 'Sale': return 'Sold';
    case 'Scrapped': return 'Scrapped';
    case 'Written Off': return 'Written Off';
    case 'Trade-in': return 'Traded In';
    case 'Auction': return 'Auctioned';
    case 'Other': return 'Disposed';
    default: return 'Disposed';
  }
};

const getDisposalStyle = (disposalType?: string | null): string => {
  switch (disposalType) {
    case 'Sale': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    case 'Scrapped': return 'bg-red-100 text-red-700 hover:bg-red-200';
    case 'Written Off': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
    case 'Trade-in': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
    case 'Auction': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
    default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  }
};

const getStatusConfig = (status: string, disposalType?: string | null) => {
  switch (status?.toLowerCase()) {
    case 'available':
      return {
        variant: 'secondary' as const,
        icon: CheckCircle,
        className: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
        label: 'Available',
        tooltip: 'Vehicle is available for rental'
      };
    case 'rented':
      return {
        variant: 'default' as const,
        icon: Car,
        className: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        label: 'Rented',
        tooltip: 'Vehicle is currently rented out'
      };
    case 'borrowed':
      return {
        variant: 'secondary' as const,
        icon: ArrowRightLeft,
        className: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        label: 'Borrowed',
        tooltip: 'Vehicle is currently lent out'
      };
    case 'disposed':
      return {
        variant: 'outline' as const,
        icon: XCircle,
        className: getDisposalStyle(disposalType),
        label: getDisposalLabel(disposalType),
        tooltip: `Vehicle has been ${getDisposalLabel(disposalType).toLowerCase()}`
      };
    default:
      return {
        variant: 'outline' as const,
        icon: AlertTriangle,
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        label: status,
        tooltip: `Status: ${status}`
      };
  }
};

export function VehicleStatusBadge({ status, disposalType, showTooltip = true, compact = false }: VehicleStatusBadgeProps) {
  const config = getStatusConfig(status, disposalType);
  const Icon = config.icon;

  const badge = (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className} ${compact ? 'text-xs px-2 py-0.5' : ''}`}>
      <Icon className="h-3 w-3" />
      {!compact && <span>{config.label}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}