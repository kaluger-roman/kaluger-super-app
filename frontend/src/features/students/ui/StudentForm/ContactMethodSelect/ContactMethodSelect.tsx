import type { FC } from "react";

import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

import { CONTACT_METHOD_LABELS } from "@shared";
import type { ContactMethod } from "@shared";

type ContactMethodSelectProps = {
  id: string;
  label: string;
  value?: ContactMethod;
  isMobile: boolean;
  onChange: (value: string) => void;
};

export const ContactMethodSelect: FC<ContactMethodSelectProps> = ({
  id,
  label,
  value,
  isMobile,
  onChange,
}) => (
  <FormControl fullWidth size={isMobile ? "small" : "medium"}>
    <InputLabel id={id}>{label}</InputLabel>
    <Select
      labelId={id}
      value={value || "WHATSAPP"}
      onChange={(e: SelectChangeEvent<string>) => onChange(e.target.value)}
      label={label}
    >
      <MenuItem value="WHATSAPP">{CONTACT_METHOD_LABELS.WHATSAPP}</MenuItem>
      <MenuItem value="TELEGRAM">{CONTACT_METHOD_LABELS.TELEGRAM}</MenuItem>
      <MenuItem value="MAX">{CONTACT_METHOD_LABELS.MAX}</MenuItem>
    </Select>
  </FormControl>
);
