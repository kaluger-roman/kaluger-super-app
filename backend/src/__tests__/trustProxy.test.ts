import express from "express";
import request from "supertest";
import { app } from "../index";
import prisma from "../lib/prisma";

describe("trust proxy", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should honor X-Forwarded-For when computing req.ip", async () => {
    const probe = express();
    probe.set("trust proxy", app.get("trust proxy"));
    probe.get("/__ip-probe", (req, res) => {
      res.json({ ip: req.ip });
    });

    const response = await request(probe)
      .get("/__ip-probe")
      .set("X-Forwarded-For", "203.0.113.42")
      .expect(200);

    expect(response.body.ip).toBe("203.0.113.42");
  });

  it("should configure trust proxy on the main app instance", () => {
    expect(app.get("trust proxy")).toBeTruthy();
  });
});
