import { Cloudflare } from 'cloudflare';
import { createConsola } from 'consola';
import { colors } from 'consola/utils';

import type { ValidationMethod } from 'cloudflare/resources/ssl/certificate-packs';

import { newQueue } from '@henrygd/queue/rl';

export interface BulkChangeSSLVerificationMethodsOptions {
  quiet?: boolean,
  dryRun?: boolean,

  cloudflareApiToken?: string,
  cloudflareApiKey?: string,
  cloudflareEmail?: string,

  zoneId: string,
  sslVerificationMethod: ValidationMethod
}

export async function bulkChangeSSLVerificationMethods({
  quiet = false,
  dryRun = false,
  cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN,
  cloudflareApiKey = process.env.CLOUDFLARE_API_KEY,
  cloudflareEmail = process.env.CLOUDFLARE_EMAIL,
  zoneId: zone_id,
  sslVerificationMethod
}: BulkChangeSSLVerificationMethodsOptions) {
  const client = new Cloudflare({
    apiEmail: cloudflareEmail,
    apiKey: cloudflareApiKey,
    apiToken: cloudflareApiToken
  });

  const logger = createConsola({
    level: quiet ? -999 : 999
  });

  const verifications = await client.ssl.verification.get({
    zone_id
  });

  const editQueue = newQueue(1, 5, 60 * 1000); // only one can happen at a time, 5 per minutes

  for (const verification of verifications) {
    // @ts-expect-error -- hostname exists
    const hostname = verification.hostname;
    // @ts-expect-error -- verification_status can be pending_validation
    if (verification.certificate_status !== 'pending_validation') {
      logger.info(colors.blue('skip'), colors.magenta(hostname), 'non-pending verification:', verification.certificate_status, verification.verification_status || '');
      continue;
    }
    if (verification.validation_method === sslVerificationMethod) {
      logger.info(colors.blue('skip'), colors.magenta(hostname), 'verification method is already set to:', verification.validation_method, verification.certificate_status, verification.verification_status || '');
      continue;
    }
    if (!verification.cert_pack_uuid) {
      logger.warn(colors.blue('skip'), colors.magenta(hostname), 'verification without cert_pack_uuid');
      continue;
    }
    if (dryRun) {
      logger.info(colors.blue(hostname), colors.blue('dry-run'), 'would change verification method from', colors.yellow(verification.validation_method || 'unknown'), 'to', colors.green(sslVerificationMethod));
    } else {
      logger.start(colors.magenta(hostname), colors.blue('changing verification method'), 'from', colors.yellow(verification.validation_method || 'unknown'), 'to', colors.green(sslVerificationMethod));
      const { cert_pack_uuid } = verification;
      // eslint-disable-next-line no-await-in-loop -- update in sequence
      const resp = await editQueue.add(() => client.ssl.verification.edit(
        cert_pack_uuid,
        { zone_id, validation_method: sslVerificationMethod }
      ));
      logger.success(colors.magenta(hostname), colors.green('changed verification method'), 'to', colors.green(resp.validation_method || 'unknown'), resp.status);
    }
  }
};
