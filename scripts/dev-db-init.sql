-- Runs once on first volume init: the dev database (tutor_app) is created by
-- POSTGRES_DB; the test database for jest/e2e is created here.
CREATE DATABASE tutor_app_test;
