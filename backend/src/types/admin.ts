import type { Request } from "express";

export type AdminJwtPayload = {
  email: string;
  isAdmin: true;
};

export type AdminRequest = Request & {
  admin?: AdminJwtPayload;
};

export type AdminLoginDto = {
  email: string;
  password: string;
};

export type AdminOverviewResponse = {
  usersCount: number;
  studentsCount: number;
  lessonsCount: number;
  serverUptime: number;
};
