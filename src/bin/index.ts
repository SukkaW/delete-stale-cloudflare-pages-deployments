import { Command } from '@commander-js/extra-typings';
import packageJson from '../../package.json';

import process from 'node:process';
import { deleteStaleCloudflarePagesDeployments } from '..';

(() => {
  const program = (new Command(packageJson.name))
    .version(packageJson.version)
    .description('CLI to delete stale Cloudflare Pages deployments')
    .showHelpAfterError()
    .showSuggestionAfterError()
    .option('--silent, --quiet', 'Suppress output', false);

  program
    .command('delete')
    .option(
      '--retain-success-count [count]',
      'Preserve first N successful deployments, allows you to instant rollback to the previous success deployments',
      '20'
    )
    .option(
      '--retain-failed-count [count]',
      'Preserve first N failed deployments to maintain access to the build logs',
      '10'
    )
    .option(
      '--retain-rencent-days [days]',
      'Preserve deployments created within the last N days to maintain access to recent build logs',
      '30'
    )
    .option(
      '--dry-run',
      'Do not delete any deployments, only log the deployments that would be deleted',
      false
    )
    .action(async ({ retainSuccessCount, retainFailedCount, retainRencentDays, dryRun }) => {
      const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
      const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY;
      const cloudflareEmail = process.env.CLOUDFLARE_EMAIL;
      const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!cloudflareApiToken && (!cloudflareApiKey || !cloudflareEmail)) {
        throw new Error('Missing Cloudflare authentication credentials. Please provide either CLOUDFLARE_API_TOKEN, or both CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL in the environment variables');
      }
      if (!cloudflareAccountId) {
        throw new Error('Missing Cloudflare account ID. Please provide CLOUDFLARE_ACCOUNT_ID in the environment variables');
      }

      let retainSuccessCountNumber = 20;
      if (typeof retainSuccessCount === 'string') {
        retainSuccessCountNumber = Number.parseInt(retainSuccessCount, 10);
      }
      let retainFailedCountNumber = 10;
      if (typeof retainFailedCount === 'string') {
        retainFailedCountNumber = Number.parseInt(retainFailedCount, 10);
      }
      let retainRencentDaysNumber = 30;
      if (typeof retainRencentDays === 'string') {
        retainRencentDaysNumber = Number.parseInt(retainRencentDays, 10);
      }

      const { quiet } = program.opts();

      await deleteStaleCloudflarePagesDeployments({
        quiet,
        dryRun,
        retainSuccessCount: retainSuccessCountNumber,
        retainFailedCount: retainFailedCountNumber,
        retainRencentDays: retainRencentDaysNumber,
        cloudflareApiToken,
        cloudflareApiKey,
        cloudflareEmail,
        cloudflareAccountId
      });
    });

  program.parse();
})();
