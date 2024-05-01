import { cdktf } from "projen";
import { NpmAccess, UpdateSnapshot } from "projen/lib/javascript";
import { JsonPatch } from "projen/lib/json-patch";

const project = new cdktf.ConstructLibraryCdktf({
  author: "Microsoft",
  authorAddress: "https://microsoft.com",
  cdktfVersion: "0.17.3",
  jsiiVersion: "~5.2.0",
  description:
    "A collection of CDK modules for provisioning and managing Terraform resources efficiently.",
  keywords: [
    "cdk",
    "cdktf",
    "terraform",
    "infrastructure",
    "cloud",
    "devops",
    "azure",
  ],
  constructsVersion: "^10.1.106",
  typescriptVersion: "~5.2.0", // should always be the same major/minor as JSII
  minNodeVersion: "20.10.0",
  defaultReleaseBranch: "main",
  name: "@microsoft/terraform-cdk-constructs",
  projenrcTs: true,
  prerelease: "pre",
  jest: true,
  testdir: "",
  prettier: true,
  repositoryUrl: "https://github.com/azure/terraform-cdk-constructs.git",
  licensed: true,
  license: "MIT",
  pullRequestTemplate: false,
  mergify: false,
  npmAccess: NpmAccess.PUBLIC,
  jestOptions: {
    updateSnapshot: UpdateSnapshot.NEVER,
  },
  deps: [
    "@cdktf/provider-azurerm@9.0.8",
    "nanoid@^4.0.2",
    "ts-md5@^1.3.1",
    "cdktf@0.17.3",
    //"constructs@^10.1.106",
    "moment@^2.30.1",
  ],
  peerDeps: ["@cdktf/provider-azurerm@9.0.8"],
  bundledDeps: ["moment@^2.30.1", "ts-md5@^1.3.1", "nanoid@^4.0.2"],
  devDeps: [
    "@cdktf/provider-azurerm@9.0.8",
    "cdktf@0.17.3",
    "@types/jest@^29.5.8",
    "@types/node@^18.7.18",
    "jest@^29.6.1",
    "ts-jest@^29.1.1",
    "ts-node@^10.9.1",
    "typescript@^4.9.5",
    //"constructs@10.1.106",
    "@types/moment@^2.13.0",
  ],
  releaseToNpm: true,
});

// Required for jest to work with CDK tests
project.jest?.addSetupFileAfterEnv("<rootDir>/setup.js");

// Fix jest warnings
if (project.jest && project.jest.config) {
  project.jest.config.maxWorkers = "100%";
  project.jest.config.globals = {};
  project.jest.config.transform = {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.dev.json" }],
  };
}
project.tsconfigDev.include.push("**/*.spec.ts");

const releaseWorkflow = project.tryFindObjectFile(
  ".github/workflows/release.yml",
);

releaseWorkflow?.patch(
  JsonPatch.add("/jobs/release/steps/4/env", {
    ARM_SUBSCRIPTION_ID: "${{ secrets.AZTFREADER_SUBSCRIPTIONID }}",
    ARM_TENANT_ID: "${{ secrets.AZTFREADER_TENANT_ID }}",
    ARM_CLIENT_ID: "${{ secrets.AZTFREADER_CLIENT_ID }}",
    ARM_CLIENT_SECRET: "${{ secrets.AZTFREADER_CLIENT_SECRET }}",
  }),
);
releaseWorkflow?.patch(JsonPatch.remove("/jobs/release_npm")); // remove npm release job, release is handled elsewhere

// Build Workflow
const buildWorkflow = project.tryFindObjectFile(".github/workflows/build.yml");
buildWorkflow?.patch(JsonPatch.remove("/jobs/build/steps/0/with")); // Remove because build tries to copy forked repo which is private
buildWorkflow?.patch(
  JsonPatch.add("/jobs/build/steps/3/env", {
    ARM_SUBSCRIPTION_ID: "${{ secrets.AZTFREADER_SUBSCRIPTIONID }}",
    ARM_TENANT_ID: "${{ secrets.AZTFREADER_TENANT_ID }}",
    ARM_CLIENT_ID: "${{ secrets.AZTFREADER_CLIENT_ID }}",
    ARM_CLIENT_SECRET: "${{ secrets.AZTFREADER_CLIENT_SECRET }}",
  }),
);

project.projectBuild.testTask.exec(
  "curl -L 'https://github.com/tfsec/tfsec/releases/download/v0.58.14/tfsec-linux-amd64' > tfsec && chmod +x tfsec && sudo mv tfsec /usr/local/bin/ && tfsec --config-file tfsec.json cdktf.out",
);

// Add .gitignore entries
project.gitignore.include("cdk.out");
project.gitignore.exclude("cdktf.out");
project.gitignore.exclude("/test");
project.gitignore.exclude("*terraform.*.tfstate*");

project.prettier?.addIgnorePattern(".github");
project.eslint?.addIgnorePattern(".github");

// Add generate index script
project.addScripts({
  "generate-index": "node ./scripts/generate-index.js",
});

project.synth();
