import "./lessonsReload.model";
import "./lessonsNotifications.model";
import "./lessonsPageLoader.model";
import "./lessonsPaginationClamp.model";

import * as lessonActionsModel from "./lessonActions.model";
import * as lessonCancellationModel from "./lessonCancellation.model";
import * as lessonsMainModel from "./lessons.model";
import * as lessonsConfirmDialogModel from "./lessonsConfirmDialog.model";
import * as lessonsDeleteDialogModel from "./lessonsDeleteDialog.model";
import * as lessonsEditDialogModel from "./lessonsEditDialog.model";
import * as lessonsFiltersModel from "./lessonsFilters.model";
import * as lessonsTabsConstants from "./lessonsTabs.constants";
import * as lessonTabsModel from "./lessonsTabs.model";
import * as lessonsViewDialogModel from "./lessonsViewDialog.model";
import * as lessonsViewModeModel from "./lessonsViewMode.model";

export const lessonsModel = {
  ...lessonTabsModel,
  ...lessonsTabsConstants,
  ...lessonsEditDialogModel,
  ...lessonsViewDialogModel,
  ...lessonsDeleteDialogModel,
  ...lessonsConfirmDialogModel,
  ...lessonsMainModel,
  ...lessonActionsModel,
  ...lessonsFiltersModel,
  ...lessonsViewModeModel,
};

export * as lessonFormModel from "./lessonForm.model";
export { lessonCancellationModel };
