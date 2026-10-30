export type SeedCredentials = {
  email: string;
  password: string;
};

export type DevSeedResult = {
  tutor: SeedCredentials;
  studentUser: SeedCredentials;
  students: number;
  lessons: number;
};
