/**
 * Turn the exported OpenAPI document into Zod schemas.
 *
 * FastAPI publishes each Pydantic model as JSON Schema under
 * `components.schemas`. This script writes one Zod schema per model, and a
 * `$ref` becomes a reference to that model's schema. Nothing about the graph
 * rules is decided here.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { jsonSchemaToZod } from "json-schema-to-zod";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openApiPath = resolve(frontendRoot, "openapi/openapi.json");
const schemaOutputPath = resolve(
  frontendRoot,
  "src/validation/generated/workflowSchema.ts",
);

const generatedFileBanner =
  "/* Generated from openapi/openapi.json by scripts/generateZodSchema.mjs. Do not edit. */\n";

function schemaExportName(schemaName) {
  const camelCaseName = schemaName
    .replace(/^[A-Z]+(?=[A-Z][a-z])/, (leadingAcronym) => leadingAcronym.toLowerCase())
    .replace(/^[A-Z]/, (firstLetter) => firstLetter.toLowerCase());
  return `${camelCaseName}Schema`;
}

function referencedSchemaNames(schemaNode, referencedNames) {
  if (Array.isArray(schemaNode)) {
    schemaNode.forEach((item) => referencedSchemaNames(item, referencedNames));
    return;
  }
  if (schemaNode === null || typeof schemaNode !== "object") return;
  if (typeof schemaNode.$ref === "string") {
    referencedNames.add(schemaNode.$ref.split("/").pop());
  }
  Object.values(schemaNode).forEach((childNode) =>
    referencedSchemaNames(childNode, referencedNames),
  );
}

function schemasInDependencyOrder(componentSchemas) {
  const schemaNames = Object.keys(componentSchemas);
  const schemaNamesBeingVisited = new Set();
  const schemaNamesAlreadyOrdered = new Set();
  const orderedSchemaNames = [];

  function visitSchema(schemaName) {
    if (schemaNamesAlreadyOrdered.has(schemaName)) return;
    if (schemaNamesBeingVisited.has(schemaName)) {
      throw new Error(`Schema "${schemaName}" refers to itself through $ref.`);
    }
    schemaNamesBeingVisited.add(schemaName);
    const referencedNames = new Set();
    referencedSchemaNames(componentSchemas[schemaName], referencedNames);
    referencedNames.forEach((referencedName) => {
      if (componentSchemas[referencedName]) visitSchema(referencedName);
    });
    schemaNamesBeingVisited.delete(schemaName);
    schemaNamesAlreadyOrdered.add(schemaName);
    orderedSchemaNames.push(schemaName);
  }

  schemaNames.forEach(visitSchema);
  return orderedSchemaNames;
}

function referenceToGeneratedSchema(schemaNode) {
  if (typeof schemaNode.$ref !== "string") return undefined;
  const referencedSchemaName = schemaNode.$ref.split("/").pop();
  return schemaExportName(referencedSchemaName);
}

function renderSchemaModule(componentSchemas) {
  const renderedSchemas = schemasInDependencyOrder(componentSchemas).map(
    (schemaName) =>
      jsonSchemaToZod(componentSchemas[schemaName], {
        name: schemaExportName(schemaName),
        module: "esm",
        noImport: true,
        type: true,
        parserOverride: referenceToGeneratedSchema,
      }),
  );
  return [
    generatedFileBanner,
    'import { z } from "zod"',
    "",
    ...renderedSchemas,
    "",
  ].join("\n");
}

const openApiDocument = JSON.parse(readFileSync(openApiPath, "utf8"));
const componentSchemas = openApiDocument.components?.schemas;
if (!componentSchemas) {
  throw new Error(`${openApiPath} has no components.schemas to convert.`);
}

writeFileSync(schemaOutputPath, renderSchemaModule(componentSchemas), "utf8");
