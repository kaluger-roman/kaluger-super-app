import { isPublicProductionServer } from "../../utils";
import type { AdminAlertDefinition } from "../adminAlerts";
import { isTurnConfigured } from "../callSignaling";

export const TURN_NOT_CONFIGURED_ALERT: AdminAlertDefinition = {
  type: "turn_not_configured",
  severity: "warning",
  title: "TURN-релей для видеозвонков не настроен",
  check: async () =>
    isPublicProductionServer() && !isTurnConfigured()
      ? {
          active: true,
          description:
            "В backend/.env не задан TURN_URL или TURN_SECRET: видеозвонки идут только через STUN, " +
            "и собеседники за строгим NAT или корпоративным файрволом не могут соединиться. " +
            "Настройка coturn: docs/ops/turn-relay.md.",
        }
      : { active: false },
};

export const CALL_ALERT_DEFINITIONS: AdminAlertDefinition[] = [TURN_NOT_CONFIGURED_ALERT];
