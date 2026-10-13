-- Separate database for automated integration and end-to-end tests.
-- Tests may reset this database; they must never touch the development or production database.
CREATE DATABASE teran_test;

-- Disposable database for the Playwright end-to-end stack (reset and re-seeded on every run).
CREATE DATABASE teran_e2e;
