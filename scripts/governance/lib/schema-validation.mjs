import fs from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";

import { resolveRepoPath } from "./path-utils.mjs";

function makeAjv() {
  return new Ajv2020({ allErrors: true, strict: false });
}

function schemaPath(error) {
  const base = error.instancePath || "/";
  if (error.keyword === "required" && error.params?.missingProperty) {
    return `${base === "/" ? "" : base}/${error.params.missingProperty}`;
  }
  return base;
}

function mtcErrorCode(error) {
  if (error.instancePath === "/review/expectation" || error.params?.missingProperty === "expectation") {
    return "HARN_MTC_REVIEW_EXPECTATION_INVALID";
  }
  if (
    error.instancePath === "/review/reviewerMustNotRelyOnBuilderClaim" ||
    error.params?.missingProperty === "reviewerMustNotRelyOnBuilderClaim"
  ) {
    return "HARN_MTC_REVIEWER_CLAIM_INVALID";
  }
  return "HARN_MTC_INSTANCE_INVALID";
}

export function validateJsonAgainstSchema({ schema, data, dataPath, collector, code }) {
  let validate;
  try {
    validate = makeAjv().compile(schema);
  } catch {
    collector.add(code, dataPath, "JSON Schema could not be compiled.", "Restore a valid JSON Schema.");
    return false;
  }

  if (validate(data)) return true;

  const errors = [...(validate.errors ?? [])].sort((left, right) => {
    const leftPath = schemaPath(left);
    const rightPath = schemaPath(right);
    if (leftPath < rightPath) return -1;
    if (leftPath > rightPath) return 1;
    const leftMessage = left.message ?? "";
    const rightMessage = right.message ?? "";
    if (leftMessage < rightMessage) return -1;
    if (leftMessage > rightMessage) return 1;
    return 0;
  });

  for (const error of errors) {
    const findingCode = code === "HARN_MTC_INSTANCE_INVALID" ? mtcErrorCode(error) : code;
    collector.add(
      findingCode,
      dataPath,
      `JSON Schema validation failed at ${schemaPath(error)}: ${error.message ?? "invalid value"}.`,
      "Update the JSON document to satisfy its schema.",
    );
  }

  return false;
}

export function validateMachineTaskContractSchemaConstants(schema, schemaRepoPath, collector) {
  const reviewProperties = schema?.properties?.review?.properties ?? {};
  if (reviewProperties.expectation?.const !== "independent_review_required") {
    collector.add(
      "HARN_MTC_SCHEMA_CONSTANT_INVALID",
      schemaRepoPath,
      "Machine Task Contract schema must enforce review.expectation as independent_review_required.",
      "Restore the const value for review.expectation.",
    );
  }

  if (reviewProperties.reviewerMustNotRelyOnBuilderClaim?.const !== true) {
    collector.add(
      "HARN_MTC_SCHEMA_CONSTANT_INVALID",
      schemaRepoPath,
      "Machine Task Contract schema must enforce review.reviewerMustNotRelyOnBuilderClaim as true.",
      "Restore the const value for review.reviewerMustNotRelyOnBuilderClaim.",
    );
  }
}

export function validateTaskContractInstances(root, schema, collector) {
  const tasksDir = resolveRepoPath(root, "governance/tasks");
  if (!fs.existsSync(tasksDir)) return;

  const taskFiles = fs
    .readdirSync(tasksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `governance/tasks/${entry.name}`)
    .sort();

  for (const taskPath of taskFiles) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(resolveRepoPath(root, taskPath), "utf8"));
    } catch {
      collector.add(
        "HARN_JSON_READ_FAILED",
        taskPath,
        "Machine Task Contract JSON is missing or invalid.",
        "Restore valid JSON for the task contract.",
      );
      continue;
    }

    validateJsonAgainstSchema({
      schema,
      data,
      dataPath: taskPath,
      collector,
      code: "HARN_MTC_INSTANCE_INVALID",
    });
  }
}
