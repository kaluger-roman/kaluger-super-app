import type { FC } from "react";
import { useEffect } from "react";

import { useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonModel } from "@entities";
import { ConfirmDialog } from "@shared/ui";

import { LessonFormContent, LessonFormActions } from "./components";
import * as Styled from "./LessonForm.styled";
import { lessonsModel, lessonFormModel, lessonCancellationModel } from "../../models";

export const LessonForm: FC = () => {
  const open = useUnit(lessonsModel.$isDialogOpen);
  const lesson = useUnit(lessonsModel.$editingLesson);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLoading = useUnit(lessonModel.$isLoading);

  const formData = useUnit(lessonFormModel.$formData);
  const errors = useUnit(lessonFormModel.$errors);
  const confirmDialog = useUnit(lessonFormModel.$confirmDialog);

  useEffect(() => {
    lessonFormModel.formOpened({ lesson, open });
  }, [lesson, open]);

  const handleChange = (field: string) => (e: { target?: { value: unknown } } | unknown) => {
    const value =
      e && typeof e === "object" && "target" in e
        ? (e as { target: { value: unknown } }).target.value
        : e;
    lessonFormModel.fieldChanged({ field, value });
  };

  const handleDateChange = (field: "startTime" | "endTime") => (date: Date | null) => {
    lessonFormModel.dateChanged({ field, value: date });
  };

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    const newData = updater(formData);
    Object.keys(newData).forEach((key) => {
      if (newData[key as keyof typeof newData] !== formData[key as keyof typeof formData]) {
        lessonFormModel.fieldChanged({ field: key, value: newData[key as keyof typeof newData] });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lessonFormModel.formSubmitted(e);
  };

  const handleClose = () => {
    if (!isLoading) {
      lessonsModel.dialogClosed();
    }
  };

  const handleCancelLesson = () => {
    if (lesson) {
      lessonCancellationModel.lessonCancelRequested(lesson);
    }
  };

  return (
    <Styled.StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      $isMobile={isMobile}
    >
      <Styled.StyledDialogTitle $isMobile={isMobile}>
        {lesson ? "Редактировать урок" : "Создать новый урок"}
      </Styled.StyledDialogTitle>

      <form onSubmit={handleSubmit}>
        <LessonFormContent
          formData={formData}
          errors={errors}
          isLoading={isLoading}
          isMobile={isMobile}
          lesson={lesson}
          handleChange={handleChange}
          handleDateChange={handleDateChange}
          setFormData={setFormData}
        />

        <LessonFormActions
          lesson={lesson}
          isLoading={isLoading}
          isMobile={isMobile}
          formData={formData}
          onClose={handleClose}
          onCancelLesson={handleCancelLesson}
        />
      </form>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={lessonFormModel.confirmDialogClosed}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="warning"
      />
    </Styled.StyledDialog>
  );
};
