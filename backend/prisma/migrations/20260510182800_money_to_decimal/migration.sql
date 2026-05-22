-- BUG-HUNT 2026-05-10 #2: денежные поля и налоговая ставка переведены с
-- Float (DOUBLE PRECISION) на NUMERIC. Float накапливает ошибки округления
-- при агрегации `_sum.price` (используется в getStatistics и taxRate),
-- что для финансовой отчётности и расчёта налога ФНС неприемлемо.
--
-- Decimal(10, 2) поддерживает суммы до 99 999 999.99 ₽ — с запасом для
-- расценок репетиторов. Decimal(5, 2) для налоговой ставки покрывает 0.00–
-- 999.99 % (фактический диапазон 0–100, обычно 6.0–7.5).

ALTER TABLE "lessons"
  ALTER COLUMN "price" TYPE DECIMAL(10, 2)
  USING "price"::DECIMAL(10, 2);

ALTER TABLE "students"
  ALTER COLUMN "hourlyRate" TYPE DECIMAL(10, 2)
  USING "hourlyRate"::DECIMAL(10, 2);

ALTER TABLE "tax_rate_periods"
  ALTER COLUMN "rate" TYPE DECIMAL(5, 2)
  USING "rate"::DECIMAL(5, 2);
