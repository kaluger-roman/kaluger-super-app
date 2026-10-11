import { useUnit } from "effector-react";

import * as userModel from "./user.model";

export const useIsTaxEnabled = (): boolean => Boolean(useUnit(userModel.$user)?.taxEnabled);
