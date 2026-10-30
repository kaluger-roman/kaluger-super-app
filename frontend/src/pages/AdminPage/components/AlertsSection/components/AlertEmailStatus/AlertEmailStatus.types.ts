export type EmailKind = "open" | "resolve";

export type EmailSubject = {
  nominative: string;
  genitive: string;
};

export type EmailStatusLine = {
  kind: EmailKind;
  text: string;
  isError: boolean;
};
