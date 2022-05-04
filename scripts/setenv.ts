const { writeFile, readFile } = require('fs');
const { argv } = require('yargs');

const environment = argv.environment;
const isProduction = environment === 'prod';
const envPath = isProduction ? '.env' : '.env';
require('dotenv').config({ path: envPath });
const env_vars = {
  production: isProduction,
  environment: isProduction ? 'prod' : 'dev',
  AUTH_SERVER_URL: process.env['AUTH_SERVER_URL'],
  CHAT_SERVER_URL: process.env['CHAT_SERVER_URL'],
  CLOUD_BASE_URL: process.env['CLOUD_BASE_URL'],
};
const targetPath = isProduction
  ? './src/environments/environment.prod.ts'
  : './src/environments/environment.ts';

const environmentFileContent = `
export const environment = ${JSON.stringify(env_vars, null, 2)};
`;

if (isProduction) {
  const path = `./src/environments/environment.ts`;
  const content = `export const environment = {};`;
  writeFile(path, content, function (err: any) {
    if (err) {
      console.log(err);
    }
    console.log(`created file ${path}`);
  });
}

// write the content to the respective file
writeFile(targetPath, environmentFileContent, function (err: any) {
  if (err) {
    console.log(err);
  }
  console.log(`Wrote variables to ${targetPath}`);
});
