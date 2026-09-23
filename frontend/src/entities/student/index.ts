import * as studentBaseModel from "./student.model";
import * as studentsRefreshModel from "./studentsRefresh.model";

export const studentModel = { ...studentBaseModel, ...studentsRefreshModel };
