import type { FC } from "react";
import { useMemo, useRef } from "react";

import { Box, Typography, CircularProgress, Checkbox, FormControlLabel } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";

import { ScheduleHeader } from "./ScheduleHeader";
import { ScheduleMain } from "./ScheduleMain";
import { CELL_HEIGHT, CELL_HEIGHT_COMPACT } from "./ScheduleView.constants";
import { generateTimeSlots } from "./ScheduleView.helpers";
import {
  useNowTicker,
  useLoadedDateRange,
  useDateRange,
  useHeaderMainScrollSync,
  useInitialCentering,
  usePreserveScrollOnPrepend,
  useStartEndHour,
} from "./ScheduleView.hooks";
import * as scheduleViewModel from "./ScheduleView.model";
import * as Styled from "./ScheduleView.styled";

type ScheduleViewProps = {
  lessons: Record<string, Lesson[]>;
  onLessonClick: (lesson: Lesson) => void;
  onLoadMoreDays: (startDate: Date, endDate: Date) => void;
};

export const ScheduleView: FC<ScheduleViewProps> = ({ lessons, onLessonClick, onLoadMoreDays }) => {
  useGate(scheduleViewModel.ScheduleViewGate);

  const centerDate = useUnit(scheduleViewModel.$centerDate);
  const compactMode = useUnit(scheduleViewModel.$compactMode);
  const containerWidth = useUnit(scheduleViewModel.$containerWidth);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const now = useNowTicker();

  const { startHour, endHour } = useStartEndHour(lessons);

  const timeSlots = useMemo(() => generateTimeSlots(startHour, endHour), [startHour, endHour]);

  const activeCellHeight = compactMode ? CELL_HEIGHT_COMPACT : CELL_HEIGHT;

  const requestedRangesRef = useRef<Set<string>>(new Set());

  const { minLoadedDate, maxLoadedDate } = useLoadedDateRange(lessons);

  const dateRange = useDateRange(minLoadedDate, maxLoadedDate, centerDate);

  const { handleHeaderScroll, handleMainScroll } = useHeaderMainScrollSync(
    mainScrollRef,
    headerScrollRef,
    onLoadMoreDays,
    minLoadedDate,
    maxLoadedDate,
    requestedRangesRef
  );

  useInitialCentering(containerWidth, dateRange, lessons, headerScrollRef, mainScrollRef);
  const isScheduleLoading = useUnit(lessonModel.loadScheduleLessonsFx.pending);

  usePreserveScrollOnPrepend(dateRange, mainScrollRef, headerScrollRef);

  return (
    <>
      <Box display="flex" alignItems="center" px={2}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={compactMode}
              onChange={(_, v) => scheduleViewModel.compactModeToggled(v)}
            />
          }
          label={<Typography variant="caption">Краткая форма</Typography>}
        />
      </Box>

      <Styled.ScheduleContainer>
        <ScheduleHeader
          dateRange={dateRange}
          headerScrollRef={headerScrollRef}
          handleHeaderScroll={handleHeaderScroll}
        />

        <Styled.ScrollContainer>
          {isScheduleLoading && (
            <Styled.LoaderOverlay>
              <CircularProgress />
            </Styled.LoaderOverlay>
          )}

          <ScheduleMain
            dateRange={dateRange}
            timeSlots={timeSlots}
            lessons={lessons}
            mainScrollRef={(el: HTMLDivElement | null) => {
              mainScrollRef.current = el;
              if (el && containerWidth === 0) scheduleViewModel.containerWidthSet(el.clientWidth);
            }}
            onLessonClick={onLessonClick}
            handleMainScroll={handleMainScroll}
            startHour={startHour}
            activeCellHeight={activeCellHeight}
            compactMode={compactMode}
            now={now}
            isLoading={isScheduleLoading}
          />
        </Styled.ScrollContainer>
      </Styled.ScheduleContainer>
    </>
  );
};
