import type { FC } from "react";

import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useUnit } from "effector-react";

import {
  ZOOM_GROUP_LABEL,
  ZOOM_IN_LABEL,
  ZOOM_OUT_LABEL,
  ZOOM_RESET_LABEL,
} from "./ZoomControls.constants";
import { formatZoomPercent } from "./ZoomControls.helpers";
import * as Styled from "./ZoomControls.styled";
import { callZoomModel } from "../../model";

export const ZoomControls: FC = () => {
  const zoom = useUnit(callZoomModel.$zoom);
  const canZoomIn = useUnit(callZoomModel.$canZoomIn);
  const canZoomOut = useUnit(callZoomModel.$canZoomOut);
  const isZoomed = useUnit(callZoomModel.$isZoomed);
  const actions = useUnit({
    zoomIn: callZoomModel.zoomInClicked,
    zoomOut: callZoomModel.zoomOutClicked,
    reset: callZoomModel.zoomReset,
  });

  return (
    <Styled.Group role="group" aria-label={ZOOM_GROUP_LABEL}>
      <Styled.StepButton
        aria-label={ZOOM_OUT_LABEL}
        disabled={!canZoomOut}
        onClick={() => actions.zoomOut()}
      >
        <RemoveIcon />
      </Styled.StepButton>
      <Styled.ScaleLabel variant="body2" aria-live="polite">
        {formatZoomPercent(zoom.scale)}
      </Styled.ScaleLabel>
      <Styled.StepButton
        aria-label={ZOOM_IN_LABEL}
        disabled={!canZoomIn}
        onClick={() => actions.zoomIn()}
      >
        <AddIcon />
      </Styled.StepButton>
      {/* Always laid out, so «−» and «+» stay under the cursor when it appears. */}
      <Tooltip title={isZoomed ? ZOOM_RESET_LABEL : ""}>
        <Styled.ResetButton
          $hidden={!isZoomed}
          aria-label={ZOOM_RESET_LABEL}
          aria-hidden={!isZoomed}
          tabIndex={isZoomed ? 0 : -1}
          data-testid="zoom-reset"
          data-visible={isZoomed}
          onClick={() => actions.reset()}
        >
          <FitScreenIcon />
          <Styled.ResetLabel>{ZOOM_RESET_LABEL}</Styled.ResetLabel>
        </Styled.ResetButton>
      </Tooltip>
    </Styled.Group>
  );
};
