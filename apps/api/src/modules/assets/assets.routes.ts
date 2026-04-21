import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestError } from '@bughuntr/shared';
import {
  assetIdParamSchema,
  createAssetBodySchema,
  importJsonBodySchema,
  listAssetsQuerySchema,
  programSlugParamSchema,
  updateAssetBodySchema,
  type ImportRow,
} from './assets.schemas.js';
import {
  AssetService,
  parseImportRowsFromCsv,
  parseImportRowsFromJson,
} from './assets.service.js';

async function optionalJwtVerify(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // anonymous
  }
}

export async function assetsRoutes(app: FastifyInstance) {
  app.post(
    '/programs/:slug/assets',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = programSlugParamSchema.parse(request.params);
      const body = createAssetBodySchema.parse(request.body);
      const asset = await AssetService.createAsset(slug, request.user.sub, body);
      return reply.status(201).send({ data: asset });
    },
  );

  app.get(
    '/programs/:slug/assets',
    { preHandler: [optionalJwtVerify] },
    async (request, reply) => {
      const { slug } = programSlugParamSchema.parse(request.params);
      const query = listAssetsQuerySchema.parse(request.query);
      const viewerId = request.user?.sub ?? null;
      const result = await AssetService.listAssets(slug, viewerId, query);
      return reply.send({ data: result });
    },
  );

  app.get(
    '/programs/:slug/assets/:id',
    { preHandler: [optionalJwtVerify] },
    async (request, reply) => {
      const { slug, id } = assetIdParamSchema.parse(request.params);
      const viewerId = request.user?.sub ?? null;
      const asset = await AssetService.getAssetDetail(slug, id, viewerId);
      return reply.send({ data: asset });
    },
  );

  app.put(
    '/programs/:slug/assets/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug, id } = assetIdParamSchema.parse(request.params);
      const body = updateAssetBodySchema.parse(request.body);
      const asset = await AssetService.updateAsset(slug, id, request.user.sub, body);
      return reply.send({ data: asset });
    },
  );

  app.delete(
    '/programs/:slug/assets/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug, id } = assetIdParamSchema.parse(request.params);
      const result = await AssetService.softDeleteAsset(slug, id, request.user.sub);
      return reply.send({ data: result });
    },
  );

  app.put(
    '/programs/:slug/assets/:id/toggle-scope',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug, id } = assetIdParamSchema.parse(request.params);
      const asset = await AssetService.toggleScope(slug, id, request.user.sub);
      return reply.send({ data: asset });
    },
  );

  app.post(
    '/programs/:slug/assets/import',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug } = programSlugParamSchema.parse(request.params);
      const ct = request.headers['content-type'] ?? '';

      let parseErrors: { index: number; message: string }[] = [];
      let rows: ImportRow[] = [];

      if (ct.includes('multipart/form-data')) {
        const file = await request.file();
        if (!file) {
          throw new BadRequestError('Missing file');
        }
        const buf = await file.toBuffer();
        const text = buf.toString('utf8');
        const name = file.filename?.toLowerCase() ?? '';
        if (name.endsWith('.json') || file.mimetype?.includes('json')) {
          try {
            const parsed = JSON.parse(text) as unknown;
            const arr = Array.isArray(parsed) ? parsed : (parsed as { assets?: unknown }).assets;
            if (!Array.isArray(arr)) {
              throw new BadRequestError('JSON must be an array or { assets: [] }');
            }
            const j = parseImportRowsFromJson(arr);
            parseErrors = j.errors;
            rows = j.rows;
          } catch {
            throw new BadRequestError('Invalid JSON file');
          }
        } else {
          const csv = parseImportRowsFromCsv(text);
          parseErrors = csv.errors;
          rows = csv.rows;
        }
      } else {
        const body = importJsonBodySchema.parse(request.body);
        const j = parseImportRowsFromJson(body.assets);
        parseErrors = j.errors;
        rows = j.rows;
      }

      if (rows.length > 500) {
        throw new BadRequestError('Maximum 500 assets per import after parsing');
      }

      const result = await AssetService.importAssets(slug, request.user.sub, rows);
      return reply.status(201).send({
        data: {
          imported: result.imported,
          errors: [...parseErrors, ...result.errors],
        },
      });
    },
  );

  app.get(
    '/programs/:slug/assets/:id/history',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { slug, id } = assetIdParamSchema.parse(request.params);
      const history = await AssetService.listScopeHistory(
        slug,
        id,
        request.user.sub,
      );
      return reply.send({ data: history });
    },
  );
}
