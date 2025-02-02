import * as yaml from "yaml";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";

export const apiDocs = () => {
  // Path to your swagger.yaml file.
  // Adjust the path if your file is in a different directory relative to the compiled code.
  const swaggerPath = path.join(__dirname, "../spec.yaml");
  const swaggerDocument = yaml.parse(fs.readFileSync(swaggerPath, "utf8"));

  return swaggerUi.setup(swaggerDocument);
};
