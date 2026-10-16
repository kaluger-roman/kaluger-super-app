import { faker } from "@faker-js/faker";

// User.email and StudentUser.email are globally unique, and faker's email generator draws
// from a finite name pool: across hundreds of users per parallel run it collides. A random
// domain keeps the realistic mixed-case local part and makes the address unique.
export const uniqueEmail = () =>
  faker.internet.email({ provider: `${faker.string.uuid()}.example.com` });
