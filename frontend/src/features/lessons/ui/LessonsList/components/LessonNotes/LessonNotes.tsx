import { memo, useCallback, useState } from "react";
import type { MouseEvent } from "react";

import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

import { useIsTextClamped } from "./LessonNotes.hooks";
import * as Styled from "./LessonNotes.styled";

type LessonNotesProps = {
  notes: string;
};

export const LessonNotes = memo<LessonNotesProps>(({ notes }) => {
  const [expanded, setExpanded] = useState(false);
  const { ref, isClamped } = useIsTextClamped(notes, expanded);

  const handleToggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const showToggle = expanded || isClamped;

  return (
    <Styled.NotesContainer>
      <Styled.NotesText
        ref={ref}
        variant="body2"
        $expanded={expanded}
      >
        📝 {notes}
      </Styled.NotesText>

      {showToggle && (
        <Styled.ToggleButton
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Свернуть заметку" : "Развернуть заметку"}
        >
          {expanded ? (
            <>
              Свернуть
              <ExpandLessIcon fontSize="small" />
            </>
          ) : (
            <>
              Развернуть
              <ExpandMoreIcon fontSize="small" />
            </>
          )}
        </Styled.ToggleButton>
      )}
    </Styled.NotesContainer>
  );
});

LessonNotes.displayName = "LessonNotes";
