import { verificationValue } from "preset-local-dependency";

if (typeof verificationValue !== "string" || verificationValue.length === 0) process.exitCode = 1;
