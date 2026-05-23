const TUTOR_TOKEN_KEY = "authToken";
const STUDENT_TOKEN_KEY = "studentToken";

export const getTutorToken = (): string | null =>
  localStorage.getItem(TUTOR_TOKEN_KEY);

export const setTutorToken = (token: string): void => {
  localStorage.setItem(TUTOR_TOKEN_KEY, token);
};

export const clearTutorToken = (): void => {
  localStorage.removeItem(TUTOR_TOKEN_KEY);
};

export const getStudentToken = (): string | null =>
  localStorage.getItem(STUDENT_TOKEN_KEY);

export const setStudentToken = (token: string): void => {
  localStorage.setItem(STUDENT_TOKEN_KEY, token);
};

export const clearStudentToken = (): void => {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
};
