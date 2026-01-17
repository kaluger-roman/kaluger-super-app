import "./lessons-reload.model";
import "./lessons-page-loader.model";

import * as lessonActionsModel from "./lesson-actions.model";
import * as lessonCancellationModel from "./lesson-cancellation.model";
import * as lessonsConfirmDialogModel from "./lessons-confirm-dialog.model";
import * as lessonsDeleteDialogModel from "./lessons-delete-dialog.model";
import * as lessonsEditDialogModel from "./lessons-edit-dialog.model";
import * as lessonsFiltersModel from "./lessons-filters.model";
import * as lessonTabsModel from "./lessons-tabs.model";
import * as lessonsViewDialogModel from "./lessons-view-dialog.model";
import * as lessonsViewModeModel from "./lessons-view-mode.model";
import * as lessonsMainModel from "./lessons.model";

export const lessonsModel = {
  ...lessonTabsModel,
  ...lessonsEditDialogModel,
  ...lessonsViewDialogModel,
  ...lessonsDeleteDialogModel,
  ...lessonsConfirmDialogModel,
  ...lessonsMainModel,
  ...lessonActionsModel,
  ...lessonsFiltersModel,
  ...lessonsViewModeModel,
};

export * as lessonFormModel from "./lesson-form.model";
export { lessonCancellationModel };
