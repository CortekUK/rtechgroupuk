import { differenceInMonths, differenceInDays, differenceInYears, parseISO, isAfter, addYears, addMonths } from "date-fns";

export const calculateDurationInMonths = (startDate: string, endDate: string | null): number => {
  if (!endDate) {
    return differenceInMonths(new Date(), parseISO(startDate));
  }
  return differenceInMonths(parseISO(endDate), parseISO(startDate));
};

export const formatDuration = (months: number): string => {
  if (months === 0) return "< 1 mo";
  return `${months} mo`;
};

export const formatDurationDetailed = (startDate: string, endDate: string | null, status?: string): string => {
  const start = parseISO(startDate);
  const today = new Date();

  // For closed rentals, calculate the actual rental period (start to end)
  // For active rentals, calculate elapsed time (start to today)
  const isClosed = status === 'Closed' || (endDate && parseISO(endDate) < today);
  const end = endDate ? parseISO(endDate) : today;

  // Calculate total days first to check for invalid/negative durations
  const totalDays = differenceInDays(end, start);

  // Handle invalid dates (end before start)
  if (totalDays < 0) {
    // For closed rentals with invalid dates, show the absolute duration that was recorded
    const absDays = Math.abs(totalDays);
    if (absDays === 0) return '< 1 day';
    if (absDays === 1) return '1 day';
    return `${absDays} days`;
  }

  const years = differenceInYears(end, start);
  const afterYears = addYears(start, years);
  const months = differenceInMonths(end, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(end, afterMonths);

  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }

  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  return parts.join(' ');
};

export const getRentalStatus = (startDate: string, endDate: string | null, status: string): string => {
  const today = new Date();
  const start = parseISO(startDate);
  
  if (isAfter(start, today)) {
    return "Upcoming";
  }
  
  return status || "Active";
};

export const getDurationFilter = (months: number): string => {
  if (months <= 12) return "≤12 mo";
  if (months <= 24) return "13–24 mo";
  return ">24 mo";
};