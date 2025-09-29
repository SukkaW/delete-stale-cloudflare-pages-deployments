import { Cloudflare } from 'cloudflare';
import process from 'node:process';
import { createConsola } from 'consola';
import { formatDate } from 'date-fns/format';
import { colors } from 'consola/utils';
import { V4PagePaginationArray } from 'cloudflare/pagination';

export interface DeleteStaleCloudflarePagesDeploymentsOptions {
  quiet?: boolean,
  redactProjectName?: boolean,
  dryRun?: boolean,

  retainSuccessCount?: number,
  retainFailedCount?: number,
  retainRencentDays?: number,

  cloudflareApiToken?: string,
  cloudflareApiKey?: string,
  cloudflareEmail?: string,

  cloudflareAccountId: string
}

class DeploymentsMultiPage extends V4PagePaginationArray<Cloudflare.Pages.Deployment> { }

class ProjectMultiPage extends V4PagePaginationArray<Cloudflare.Pages.Project> { }

export async function deleteStaleCloudflarePagesDeployments({
  quiet = false,
  dryRun = false,
  retainSuccessCount = 20,
  retainFailedCount = 10,
  retainRencentDays = 30,
  cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN,
  cloudflareApiKey = process.env.CLOUDFLARE_API_KEY,
  cloudflareEmail = process.env.CLOUDFLARE_EMAIL,
  cloudflareAccountId: account_id
}: DeleteStaleCloudflarePagesDeploymentsOptions) {
  const client = new Cloudflare({
    apiEmail: cloudflareEmail,
    apiKey: cloudflareApiKey,
    apiToken: cloudflareApiToken
  });

  const logger = createConsola({
    level: quiet ? -999 : 999
  });

  const { red, blue, green, yellow, magenta, gray, underline } = colors;

  const start = new Date();
  const startTimtstamp = start.getTime();

  // TODO: https://github.com/cloudflare/cloudflare-typescript/issues/2680
  // Before that is fixed, manually fire request with proper type to get all deployments
  for await (const project of await client.getAPIList(
    `/accounts/${account_id}/pages/projects`,
    ProjectMultiPage,
    { query: { page: 1 } }
  )) {
    if (!project.name) {
      logger.warn('Skipping project without name:', project.id);
      continue;
    }

    logger.start('Project:', magenta(project.name));

    let successCount = 0;
    let failedCount = 0;

    // TODO: https://github.com/cloudflare/cloudflare-typescript/issues/2680
    // Before that is fixed, manually fire request with proper type to get all deployments
    for await (const deployment of await client.getAPIList(
      `/accounts/${account_id}/pages/projects/${project.name}/deployments`,
      DeploymentsMultiPage,
      { query: { page: 1 } } // this is required to get the nextPageInfo right
    )) {
      if (!deployment.id) {
        logger.warn('Skipping deployment without id:', deployment);
        continue;
      }
      if (!deployment.created_on) {
        logger.warn('Skipping deployment without created_on:', deployment.id);
        continue;
      }

      const isSuccess = deployment.latest_stage?.status === 'success';
      const isFailed = deployment.latest_stage?.status === 'failure';
      if (isSuccess) {
        successCount++;
      }
      if (isFailed) {
        failedCount++;
      }

      const date = new Date(deployment.created_on);
      const dateStr = formatDate(date, 'yyyy-MM-dd HH:mm:ss');

      const status = deployment.is_skipped
        ? blue('skipped')
        : deployment.latest_stage?.status === 'success'
          ? green('success')
          : deployment.latest_stage?.status === 'failure'
            ? red('failure')
            : yellow(deployment.latest_stage?.status || 'unknown');

      const urlColorFn = isFailed ? gray : underline;

      const url = urlColorFn(deployment.url || 'https://unknown');

      const key = `${dateStr} ${deployment.environment} ${url} (${status})`;
      const project_name = magenta('[' + deployment.project_name + ']');

      if (deployment.aliases != null && deployment.aliases.length > 0) {
        logger.info(`${project_name} ${gray(`(skip active deployments ${deployment.aliases.join(', ')})`)} ${key}`);
        continue;
      }

      if (startTimtstamp - date.getTime() <= retainRencentDays * 24 * 60 * 60 * 1000) {
        logger.info(`${project_name} ${gray(`(skip recent ${retainRencentDays}d)`)} ${key}`);
        continue;
      }

      if (isSuccess && successCount <= retainSuccessCount) {
        logger.info(`${project_name} ${gray(`(skip first ${retainSuccessCount} succeed)`)} ${key}`);
        continue;
      }

      if (isFailed && failedCount <= retainFailedCount) {
        logger.info(`${project_name} ${gray(`(skip first ${retainFailedCount} failed)`)} ${key}`);
        continue;
      }

      if (dryRun) {
        logger.success(`${project_name} (dry run) ${key}`);
      } else {
        await client.pages.projects.deployments.delete(project.name, deployment.id, { account_id });
        logger.success(`${project_name} (delete) ${key}`);
      }
    }
  };
}
