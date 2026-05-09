import { useMemo } from "react";

import AddIcon from "@mui/icons-material/Add";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useUnit } from "effector-react";

import { taxRatePeriodsModalModel, todayIso } from "../../model";
import { TaxRatePeriodRow } from "../TaxRatePeriodRow";
import { computePeriodFlags } from "./TaxRatePeriodsModal.helpers";
import * as Styled from "./TaxRatePeriodsModal.styled";

export const TaxRatePeriodsModal = () => {
  const isOpen = useUnit(taxRatePeriodsModalModel.$isModalOpen);
  const draft = useUnit(taxRatePeriodsModalModel.$draftPeriods);
  const error = useUnit(taxRatePeriodsModalModel.$error);

  const actions = useUnit({
    closed: taxRatePeriodsModalModel.modalClosed,
    added: taxRatePeriodsModalModel.periodAdded,
    startDateChanged: taxRatePeriodsModalModel.periodStartDateChanged,
    rateChanged: taxRatePeriodsModalModel.periodRateChanged,
    removed: taxRatePeriodsModalModel.periodRemoved,
    save: taxRatePeriodsModalModel.saveRequested,
  });

  const today = todayIso();
  const flags = useMemo(() => computePeriodFlags(draft, today), [draft, today]);
  const canSave = draft.length > 0;

  return (
    <Dialog
      open={isOpen}
      onClose={actions.closed}
      maxWidth="sm"
      fullWidth
      aria-labelledby="tax-rate-periods-dialog-title"
    >
      <DialogTitle id="tax-rate-periods-dialog-title">
        Налоговые ставки
      </DialogTitle>
      <DialogContent>
        <Styled.RowsContainer>
          {draft.length === 0 ? (
            <Styled.EmptyMessage variant="body2" color="text.secondary">
              Нет настроенных периодов. Добавьте хотя бы один, чтобы система могла
              рассчитать налог.
            </Styled.EmptyMessage>
          ) : (
            draft.map((period) => {
              const periodFlags = flags.get(period.tempId);
              return (
                <TaxRatePeriodRow
                  key={period.tempId}
                  startDate={period.startDate}
                  rate={period.rate}
                  isCurrent={periodFlags?.isCurrent}
                  isFuture={periodFlags?.isFuture}
                  onStartDateChange={(startDate) =>
                    actions.startDateChanged({
                      tempId: period.tempId,
                      startDate,
                    })
                  }
                  onRateChange={(rate) =>
                    actions.rateChanged({ tempId: period.tempId, rate })
                  }
                  onRemove={() => actions.removed({ tempId: period.tempId })}
                />
              );
            })
          )}
          <Button
            startIcon={<AddIcon />}
            onClick={actions.added}
            variant="outlined"
            size="small"
          >
            Добавить период
          </Button>
          {error ? (
            <Styled.ErrorMessage variant="body2" role="alert">
              {error}
            </Styled.ErrorMessage>
          ) : null}
        </Styled.RowsContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={actions.closed}>Отмена</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={actions.save}
          disabled={!canSave}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
