import type { FC } from "react";

import { useUnit } from "effector-react";

import { lessonModel, useIsTaxEnabled } from "@entities";
import type { Lesson } from "@shared";

import * as lessonActionsModel from "../../models/lessonActions.model";
import { TaxExemptSwitch } from "../TaxExemptSwitch";

type TaxExemptStatusProps = {
  lesson: Lesson;
};

export const TaxExemptStatus: FC<TaxExemptStatusProps> = ({ lesson }) => {
  const isTaxEnabled = useIsTaxEnabled();
  const isUpdating = useUnit(lessonModel.updateLessonFx.pending);
  const actions = useUnit({ lessonTaxExemptChanged: lessonActionsModel.lessonTaxExemptChanged });

  if (!isTaxEnabled) return null;

  return (
    <TaxExemptSwitch
      checked={Boolean(lesson.isTaxExempt)}
      disabled={isUpdating}
      onChange={(isTaxExempt) =>
        actions.lessonTaxExemptChanged({ lessonId: lesson.id, isTaxExempt })
      }
    />
  );
};
