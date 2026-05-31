import { useCallback, useState } from "react";

import type { Lesson } from "@shared";

export const useLessonMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const handleMenuClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
      setSelectedLesson(lesson);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedLesson(null);
  }, []);

  return {
    anchorEl,
    selectedLesson,
    handleMenuClick,
    handleMenuClose,
  };
};
