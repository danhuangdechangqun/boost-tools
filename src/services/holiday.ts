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