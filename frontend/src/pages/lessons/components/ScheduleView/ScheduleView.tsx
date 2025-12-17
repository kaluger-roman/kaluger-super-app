import { useState, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import type { Lesson } from "../../../../shared";
import { useUnit } from "effector-react";
import { loadScheduleLessonsFx } from "../../../../entities/lesson/model/lesson";
import { generateTimeSlots } from "./ScheduleView.helpers";
import { CELL_HEIGHT, CELL_HEIGHT_COMPACT } from "./ScheduleView.constants";
import {
  ScheduleContainer,
  ScrollContainer,
  LoaderOverlay,
} from "./ScheduleView.styled";
import { ScheduleHeader } from "./ScheduleHeader";
import { ScheduleMain } from "./ScheduleMain";
import {
  useNowTicker,
  useLoadedDateRange,
  useDateRange,
  useHeaderMainScrollSync,
  useInitialCentering,
  usePreserveScrollOnPrepend,
  useStartEndHour,
} from "./ScheduleView.hooks";

type ScheduleViewProps = {
  lessons: Record<string, Lesson[]>;
  onLessonClick: (lesson: Lesson) => void;
  onLoadMoreDays: (startDate: Date, endDate: Date) => void;
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  lessons,
  onLessonClick,
  onLoadMoreDays,
}) => {
  const [centerDate] = useState(new Date());
  const [compactMode, setCompactMode] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const now = useNowTicker();

  const { startHour, endHour } = useStartEndHour(lessons);

  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour),
    [startHour, endHour]
  );

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

  useInitialCentering(
    containerWidth,
    dateRange,
    lessons,
    headerScrollRef,
    mainScrollRef
  );
  const isScheduleLoading = useUnit(loadScheduleLessonsFx.pending);

  usePreserveScrollOnPrepend(dateRange, mainScrollRef, headerScrollRef);

  return (
    <>
      <Box display="flex" alignItems="center" px={2}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={compactMode}
              onChange={(_, v) => setCompactMode(v)}
            />
          }
          label={<Typography variant="caption">Краткая форма</Typography>}
        />
      </Box>

      <ScheduleContainer>
        <ScheduleHeader
          dateRange={dateRange}
          headerScrollRef={headerScrollRef}
          handleHeaderScroll={handleHeaderScroll}
        />

        <ScrollContainer>
          {isScheduleLoading && (
            <LoaderOverlay>
              <CircularProgress />
            </LoaderOverlay>
          )}

          <ScheduleMain
            dateRange={dateRange}
            timeSlots={timeSlots}
            lessons={lessons}
            mainScrollRef={(el: any) => {
              mainScrollRef.current = el;
              if (el && containerWidth === 0) setContainerWidth(el.clientWidth);
            }}
            onLessonClick={onLessonClick}
            handleMainScroll={handleMainScroll}
            startHour={startHour}
            activeCellHeight={activeCellHeight}
            compactMode={compactMode}
            now={now}
            isLoading={isScheduleLoading}
          />
        </ScrollContainer>
      </ScheduleContainer>
    </>
  );
};
