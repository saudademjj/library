/**
 * 时间处理工具函数
 * 统一使用UTC+8时区（中国标准时间）
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 启用插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为上海（UTC+8）
export const TIMEZONE = 'Asia/Shanghai';

/**
 * 获取当前UTC+8时间
 */
export function now(): Date {
  return dayjs().tz(TIMEZONE).toDate();
}

/**
 * 将任意日期转换为UTC+8时区
 */
export function toChineseTime(date: Date | string): Date {
  return dayjs(date).tz(TIMEZONE).toDate();
}

/**
 * 获取当天开始时间（00:00:00）- UTC+8
 */
export function startOfDay(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).startOf('day').toDate();
}

/**
 * 获取当天结束时间（23:59:59.999）- UTC+8
 */
export function endOfDay(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).endOf('day').toDate();
}

/**
 * 添加分钟
 */
export function addMinutes(date: Date | string, minutes: number): Date {
  return dayjs(date).tz(TIMEZONE).add(minutes, 'minute').toDate();
}

/**
 * 添加小时
 */
export function addHours(date: Date | string, hours: number): Date {
  return dayjs(date).tz(TIMEZONE).add(hours, 'hour').toDate();
}

/**
 * 添加天数
 */
export function addDays(date: Date | string, days: number): Date {
  return dayjs(date).tz(TIMEZONE).add(days, 'day').toDate();
}

/**
 * 计算两个时间的分钟差
 */
export function diffMinutes(date1: Date | string, date2: Date | string): number {
  return dayjs(date1).diff(dayjs(date2), 'minute');
}

/**
 * 比较两个时间：date1 是否在 date2 之前
 */
export function isBefore(date1: Date | string, date2: Date | string): boolean {
  return dayjs(date1).isBefore(dayjs(date2));
}

/**
 * 比较两个时间：date1 是否在 date2 之后
 */
export function isAfter(date1: Date | string, date2: Date | string): boolean {
  return dayjs(date1).isAfter(dayjs(date2));
}

/**
 * 格式化时间为中文格式
 */
export function formatDateTime(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format('YYYY年MM月DD日 HH:mm');
}

/**
 * 格式化时间为简短格式
 */
export function formatTime(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format('HH:mm');
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * 解析日期字符串为UTC+8的Date对象
 */
export function parseDate(dateString: string): Date {
  return dayjs.tz(dateString, TIMEZONE).toDate();
}

/**
 * 获取未来24小时的时间点
 */
export function next24Hours(from?: Date | string): Date {
  const base = from ? dayjs(from) : dayjs();
  return base.tz(TIMEZONE).add(24, 'hour').toDate();
}

/**
 * 设置时间为指定的时分秒
 */
export function setTime(date: Date | string, hour: number, minute: number = 0, second: number = 0): Date {
  return dayjs(date).tz(TIMEZONE).hour(hour).minute(minute).second(second).millisecond(0).toDate();
}
