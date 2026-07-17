import { execFile } from "node:child_process";

const GH_TIMEOUT_MS = 30_000;
const GH_MAX_BUFFER = 4 * 1024 * 1024;
const MAX_GRAPHQL_RESPONSE_BYTES = 4 * 1024 * 1024;

export const IDENTITY_QUERY = "query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){baseRepository{nameWithOwner}headRepository{nameWithOwner}baseRefOid headRefOid}}}";
export const CURRENT_HEAD_QUERY = "query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid}}}";

export async function queryGraphql(runGh, query, repository, pullRequestNumber, stage) {
  const [owner, name] = repository.split("/");
  const args = ["api", "graphql", "-f", `query=${query}`];
  const variables = { name, number: pullRequestNumber, owner };
  for (const [key, value] of Object.entries(variables).sort(([left], [right]) => compare(left, right))) {
    args.push(typeof value === "number" ? "-F" : "-f", `${key}=${value}`);
  }

  let source;
  try {
    source = await runGh(args);
  } catch {
    throw new Error(stage);
  }
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_GRAPHQL_RESPONSE_BYTES) {
    throw new Error(stage);
  }
  try {
    const result = JSON.parse(source);
    if (!isPlainObject(result)
        || (Object.hasOwn(result, "errors")
          && (!Array.isArray(result.errors) || result.errors.length > 0))) {
      throw new Error(stage);
    }
    return result;
  } catch {
    throw new Error(stage);
  }
}
export async function runGhCommand(args) {
  return new Promise((resolve, reject) => {
    execFile("gh", args, {
      encoding: "utf8",
      maxBuffer: GH_MAX_BUFFER,
      timeout: GH_TIMEOUT_MS,
      windowsHide: true,
      shell: false,
    }, (error, stdout) => {
      if (error) {
        reject(new Error("GitHub command failed"));
        return;
      }
      resolve(stdout);
    });
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
