import { verificationValue } from "preset-local-dependency";

if (verificationValue !== "local-file-dependency") process.exitCode = 1;
