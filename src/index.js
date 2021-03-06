#!/usr/bin/env node

/**
 * ct-migrations A tool for applying pre-determined changes to resources in a commercetools project.
 */

import commander from 'commander';
import fs from 'fs';
import Commercetools from './commercetools';
import Migration from './migration';
import Logger from './logger';

commander.version('0.1.0', '-v, --version')
  .usage('[options] <migrationsDirectory>')
  .arguments('[options] <migrationsDirectory>')
  .option('-c, --clientId [clientId]', 'Client ID', process.env.CLIENT_ID)
  .option('-s, --clientSecret [clientSecret]', 'Client Secret', process.env.CLIENT_SECRET)
  .option('-p, --projectKey [projectKey]', 'Project Key', process.env.PROJECT_KEY)
  .option('-a, --authUrl [authUrl]', 'Auth URL', process.env.AUTH_URL || 'https://auth.commercetools.co')
  .option('-i, --apiUrl [apiUrl]', 'API URL', process.env.API_URL || 'https://api.commercetools.co')
  .option('-t, --concurrency [concurrency]', 'Concurrency', 10)
  .option('-d, --dryRun', 'Dry Run', false);

commander.on('--help', () => {
  console.info('  Environment Variables:');
  console.info('');
  console.info('    CLIENT_ID');
  console.info('    CLIENT_SECRET');
  console.info('    PROJECT_KEY');
  console.info('    AUTH_URL');
  console.info('    API_URL');
  console.info('');
});

commander.parse(process.argv);

const logger = Logger({
  level: commander.logLevel,
  isDisabled: false,
});

// ensure we have a migrations dir and all settings are set.
let valid = true;
if (!commander.clientId) {
  logger.warn('No client ID specified.  Please set CLIENT_ID or use the -c/--clientId flag to specify one.');
  valid = false;
}
if (!commander.clientSecret) {
  logger.warn('No client secret specified.  Please set CLIENT_SECRET or use the -s/--clientSecret flag to specify one.');
  valid = false;
}
if (!commander.projectKey) {
  logger.warn('No project key specified.  Please set PROJECT_KEY or use the -p/--projectKey flag to specify one.');
  valid = false;
}
if (!commander.args[0]) {
  logger.warn('No migrations directory specified.  Usage: ct-migrate [options] <migrationsDirectory>');
  valid = false;
}
if (!fs.existsSync(commander.args[0]) || !fs.lstatSync(commander.args[0]).isDirectory()) {
  logger.warn(`Migrations directory "${commander.args[0]}" is not a directory.  Usage: ct-migrate [options] <migrationsDirectory>`);
  valid = false;
}
// exit if missing a parameter
if (!valid) {
  process.exit(1);
}

// setup ct client
const commercetools = Commercetools({
  clientId: commander.clientId,
  clientSecret: commander.clientSecret,
  projectKey: commander.projectKey,
  host: commander.apiUrl,
  oauthHost: commander.authUrl,
  concurrency: commander.concurrency,
});

const migration = new Migration({
  commercetools,
  migrationsDirectory: commander.args[0],
  dryRun: commander.dryRun,
  logger,
});


const performMigraiton = async () => {
  try {
    await migration.getLastApplied();
    await migration.applyNewMigrations();
  } catch (e) {
    logger.error('The ct-migrate tool ran into an error during migrations!\n' +
      `Last successfully applied migration: ${migration.lastApplied.value}\nError message: ${JSON.stringify(e)}`);
  }
};

// perform the migrations
performMigraiton();

