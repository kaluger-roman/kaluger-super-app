import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { LessonsMap } from "./ScheduleView.types";
import { generateDateRange, getDateKey } from "./ScheduleView.helpers";
import { Lesson } from "../../../../shared";

export const useNowTicker = () => {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 60 * 1000);
    tick();
    return () => clearInterval(interval);
  }, []);
  return now;
};

export const useLoadedDateRange = (lessons: LessonsMap) =>
  useMemo(() => {
    const keys = Object.keys(lessons || {});
    if (keys.length === 0)
      return {
        minLoadedDate: null as Date | null,
        maxLoadedDate: null as Date | null,
      };
    const dates = keys.map((k) => new Date(k));
    const times = dates.map((d) => d.getTime());
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    return { minLoadedDate: min, maxLoadedDate: max };
  }, [lessons]);

export const useDateRange = (
  minLoadedDate: Date | null,
  maxLoadedDate: Date | null,
  centerDate: Date
) =>
  useMemo(() => {
    if (minLoadedDate && maxLoadedDate) {
      const start = new Date(minLoadedDate);
      const end = new Date(maxLoadedDate);
      start.setDate(start.getDate() - 3);
      end.setDate(end.getDate() + 3);
      const dates: Date[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    }

    return generateDateRange(centerDate);
  }, [minLoadedDate, maxLoadedDate, centerDate]);

export const useInitialCentering = (
  containerWidth: number,
  dateRange: Date[],
  lessons: LessonsMap,
  headerScrollRef: React.RefObject<HTMLDivElement | null>,
  mainScrollRef: React.RefObject<HTMLDivElement | null>
) => {
  const didInitialCenterRef = useRef(false);
  useEffect(() => {
    if (didInitialCenterRef.current) return;
    if (containerWidth > 0 && dateRange.length > 0) {
      const todayIndex = dateRange.findIndex(
        (date) => getDateKey(date) === getDateKey(new Date())
      );
      if (todayIndex >= 0 && Object.keys(lessons).length > 0) {
        const initialScroll = Math.max(
          0,
          todayIndex * 180 - containerWidth / 2 + 80
        );
        if (headerScrollRef.current)
          headerScrollRef.current.scrollLeft = initialScroll;
        if (mainScrollRef.current)
          mainScrollRef.current.scrollLeft = initialScroll;
        didInitialCenterRef.current = true;
      }
    }
  }, [containerWidth, dateRange, lessons, headerScrollRef, mainScrollRef]);
};

export const usePreserveScrollOnPrepend = (
  dateRange: Date[],
  mainScrollRef: React.RefObject<HTMLDivElement | null>,
  headerScrollRef: React.RefObject<HTMLDivElement | null>
) => {
  const prevStartRef = useRef<Date | null>(null);
  useEffect(() => {
    if (!mainScrollRef.current) {
      prevStartRef.current = dateRange[0] || null;
      return;
    }

    const prevStart = prevStartRef.current;
    const newStart = dateRange[0] || null;
    if (!prevStart || !newStart) {
      prevStartRef.current = newStart;
      return;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(
      (prevStart.getTime() - newStart.getTime()) / msPerDay
    );
    if (diffDays > 0) {
      const deltaPx = diffDays * 180;
      if (mainScrollRef.current)
        mainScrollRef.current.scrollLeft =
          (mainScrollRef.current.scrollLeft || 0) + deltaPx;
      if (headerScrollRef.current)
        headerScrollRef.current.scrollLeft =
          (headerScrollRef.current.scrollLeft || 0) + deltaPx;
    }

    prevStartRef.current = newStart;
  }, [dateRange, mainScrollRef, headerScrollRef]);
};

export const useHeaderMainScrollSync = (
  mainScrollRef: React.RefObject<HTMLDivElement | null>,
  headerScrollRef: React.RefObject<HTMLDivElement | null>,
  onLoadMoreDays: (startDate: Date, endDate: Date) => void,
  minLoadedDate: Date | null,
  maxLoadedDate: Date | null,
  requestedRangesRef: React.MutableRefObject<Set<string>>
) => {
  const handleHeaderScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      if (mainScrollRef.current)
        mainScrollRef.current.scrollLeft = element.scrollLeft;
    },
    [mainScrollRef]
  );

  const handleMainScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      if (headerScrollRef.current)
        headerScrollRef.current.scrollLeft = element.scrollLeft;

      const distanceToRight =
        element.scrollWidth - element.clientWidth - element.scrollLeft;
      const distanceToLeft = element.scrollLeft;

      if (distanceToRight < 150 && maxLoadedDate) {
        const endDate = new Date(maxLoadedDate);
        endDate.setDate(maxLoadedDate.getDate() + 7);
        const key = `${maxLoadedDate.toISOString()}_${endDate.toISOString()}`;
        if (requestedRangesRef.current.has(key)) return;
        requestedRangesRef.current.add(key);
        onLoadMoreDays(maxLoadedDate, endDate);
      } else if (distanceToLeft < 150 && minLoadedDate) {
        const startDate = new Date(minLoadedDate);
        startDate.setDate(minLoadedDate.getDate() - 7);
        const key = `${startDate.toISOString()}_${minLoadedDate.toISOString()}`;
        if (requestedRangesRef.current.has(key)) return;
        requestedRangesRef.current.add(key);
        onLoadMoreDays(startDate, minLoadedDate);
      }
    },
    [
      headerScrollRef,
      maxLoadedDate,
      minLoadedDate,
      onLoadMoreDays,
      requestedRangesRef,
    ]
  );

  return { handleHeaderScroll, handleMainScroll };
};

export const useStartEndHour = (lessons: Record<string, Lesson[]>) =>
  useMemo(() => {
    let minHour = 24;
    let maxHour = 0;
    Object.values(lessons).forEach((dayLessons) => {
      dayLessons.forEach((lesson) => {
        const s = new Date(lesson.startTime).getHours();
        const e = new Date(lesson.endTime).getHours();
        if (!Number.isNaN(s)) minHour = Math.min(minHour, s);
        if (!Number.isNaN(e)) maxHour = Math.max(maxHour, e);
      });
    });
    if (minHour === 24) minHour = 8;
    if (maxHour === 0) maxHour = 20;
    const padBefore = 0;
    const padAfter = 0;
    const start = Math.max(0, minHour - padBefore);
    const end = Math.min(24, maxHour + padAfter);
    return { startHour: start, endHour: Math.max(start + 1, end) };
  }, [lessons]);
