// 节假日服务 - 使用holiday-cn数据

interface HolidayDay {
  name: string;
  date: string;
  isOffDay: boolean;
}

interface HolidayData {
  year: number;
  days: HolidayDay[];
}

// 缓存节假日数据
const holidayCache: Map<string, HolidayData> = new Map();

// 加载指定年份的节假日数据
const loadYearData = async (year: number): Promise<HolidayData | null> => {
  if (holidayCache.has(String(year))) {
    return holidayCache.get(String(year)) || null;
  }

  try {
    const response = await fetch(`/holiday-cn/${year}.json`);
    if (!response.ok) {
      console.warn(`Holiday data for year ${year} not found`);
      return null;
    }
    const data: HolidayData = await response.json();
    holidayCache.set(String(year), data);
    return data;
  } catch (error) {
    console.warn(`Failed to load holiday data for year ${year}:`, error);
    return null;
  }
};

// 初始化节假日数据（预加载当前年份和前后一年）
export const initHolidays = async () => {
  const currentYear = new Date().getFullYear();
  await Promise.all([
    loadYearData(currentYear - 1),
    loadYearData(currentYear),
    loadYearData(currentYear + 1),
  ]);
};

// 判断某天是否为节假日
export const isHoliday = (date: string | Date): { isHoliday: boolean; isOffDay: boolean; name?: string } => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const year = parseInt(dateStr.split('-')[0]);

  const yearData = holidayCache.get(String(year));
  if (!yearData) {
    // 未加载该年数据，使用简单判断（周末）
    const d = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeek = d.getDay();
    return { isHoliday: false, isOffDay: dayOfWeek === 0 || dayOfWeek === 6, name: undefined };
  }

  const dayInfo = yearData.days.find(d => d.date === dateStr);
  if (dayInfo) {
    return {
      isHoliday: true,
      isOffDay: dayInfo.isOffDay,
      name: dayInfo.name
    };
  }

  // 非节假日，判断是否周末
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getDay();
  return { isHoliday: false, isOffDay: dayOfWeek === 0 || dayOfWeek === 6, name: undefined };
};

// 判断是否为工作日
export const isWorkday = (date: string | Date): boolean => {
  const { isOffDay } = isHoliday(date);
  return !isOffDay;
};

// 获取下一个工作日
export const getNextWorkday = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + 1);

  // 最多检查30天
  for (let i = 0; i < 30; i++) {
    if (isWorkday(d)) {
      return d.toISOString().split('T')[0];
    }
    d.setDate(d.getDate() + 1);
  }

  // 默认返回下一天
  return d.toISOString().split('T')[0];
};

// 获取本周五（或节假日前最后一个工作日）
export const getFridayOrLastWorkday = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // 计算本周五
  const friday = new Date(today);
  friday.setDate(today.getDate() + (5 - dayOfWeek));

  // 检查周五是否为工作日
  if (isWorkday(friday)) {
    return friday.toISOString().split('T')[0];
  }

  // 否则向前找到最后一个工作日
  for (let i = 0; i < 5; i++) {
    friday.setDate(friday.getDate() - 1);
    if (isWorkday(friday)) {
      return friday.toISOString().split('T')[0];
    }
  }

  return friday.toISOString().split('T')[0];
};

// 判断今天是否应该生成周报（周五或节假日前的最后一个工作日）
export const shouldGenerateWeeklyReport = (): boolean => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 检查今天是否为周五
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 5 && isWorkday(today)) {
    return true;
  }

  // 检查明天是否为休息日，且今天是工作日
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (isWorkday(today) && !isWorkday(tomorrow)) {
    return true;
  }

  return false;
};

// 辅助函数：获取指定日期所在周的周一
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  // 周日是0，周一到周六是1-6
  // 如果是周日，需要减6天；否则减去(当前星期-1)天
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + daysToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 辅助函数：获取指定日期所在周的周五
const getFridayOfWeek = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
};

// 辅助函数：格式化日期为 YYYY-MM-DD 字符串
const formatDateStr = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 获取本周工作日范围 { start, end }
// 本周开始：从周一开始找第一个工作日
// 本周结束：从周五开始，如果不是工作日则往前找最后一个工作日
export const getCurrentWeekWorkdays = (): { start: string; end: string } => {
  const today = new Date();
  const monday = getMondayOfWeek(today);

  // 从周一开始找第一个工作日
  let startDate = new Date(monday);
  for (let i = 0; i < 7; i++) {
    if (isWorkday(startDate)) {
      break;
    }
    startDate.setDate(startDate.getDate() + 1);
  }

  // 从周五开始，如果不是工作日则往前找最后一个工作日
  const friday = getFridayOfWeek(today);
  let endDate = new Date(friday);
  if (!isWorkday(endDate)) {
    // 往前找最后一个工作日
    for (let i = 0; i < 5; i++) {
      endDate.setDate(endDate.getDate() - 1);
      if (isWorkday(endDate)) {
        break;
      }
    }
  }

  return {
    start: formatDateStr(startDate),
    end: formatDateStr(endDate)
  };
};

// 判断日期是否在本周工作日范围内
export const isInCurrentWeek = (date: string | Date): boolean => {
  const { start, end } = getCurrentWeekWorkdays();
  const dateStr = typeof date === 'string' ? date : formatDateStr(date);
  return dateStr >= start && dateStr <= end;
};

// 获取上周工作日范围
export const getLastWeekWorkdays = (): { start: string; end: string } => {
  const today = new Date();
  // 获取本周周一，然后减7天得到上周周一
  const thisMonday = getMondayOfWeek(today);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  // 从上周周一开始找第一个工作日
  let startDate = new Date(lastMonday);
  for (let i = 0; i < 7; i++) {
    if (isWorkday(startDate)) {
      break;
    }
    startDate.setDate(startDate.getDate() + 1);
  }

  // 从上周周五开始，如果不是工作日则往前找最后一个工作日
  const lastFriday = new Date(lastMonday);
  lastFriday.setDate(lastMonday.getDate() + 4);
  let endDate = new Date(lastFriday);
  if (!isWorkday(endDate)) {
    for (let i = 0; i < 5; i++) {
      endDate.setDate(endDate.getDate() - 1);
      if (isWorkday(endDate)) {
        break;
      }
    }
  }

  return {
    start: formatDateStr(startDate),
    end: formatDateStr(endDate)
  };
};

// 获取指定周的工作日范围（参数：周的起始周一日期）
export const getWeekWorkdays = (weekStartMonday: string): { start: string; end: string } => {
  const monday = new Date(weekStartMonday);

  // 从周一开始找第一个工作日
  let startDate = new Date(monday);
  for (let i = 0; i < 7; i++) {
    if (isWorkday(startDate)) {
      break;
    }
    startDate.setDate(startDate.getDate() + 1);
  }

  // 从周五开始，如果不是工作日则往前找最后一个工作日
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  let endDate = new Date(friday);
  if (!isWorkday(endDate)) {
    for (let i = 0; i < 5; i++) {
      endDate.setDate(endDate.getDate() - 1);
      if (isWorkday(endDate)) {
        break;
      }
    }
  }

  return {
    start: formatDateStr(startDate),
    end: formatDateStr(endDate)
  };
};

// 获取最近N周的工作日范围列表（从本周开始往前推N周）
export const getRecentWeeksWorkdays = (n: number): Array<{ start: string; end: string; label: string }> => {
  const result: Array<{ start: string; end: string; label: string }> = [];

  for (let i = 0; i < n; i++) {
    const today = new Date();
    // 计算第i周前的周一
    const thisMonday = getMondayOfWeek(today);
    const targetMonday = new Date(thisMonday);
    targetMonday.setDate(thisMonday.getDate() - 7 * i);

    const mondayStr = formatDateStr(targetMonday);
    const { start, end } = getWeekWorkdays(mondayStr);

    result.push({
      start,
      end,
      label: `${mondayStr} 周`
    });
  }

  return result;
};