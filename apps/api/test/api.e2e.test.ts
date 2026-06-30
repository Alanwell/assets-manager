import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { AssetStatus, DepreciationMethod } from '@asset-manager/domain';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { createApplication } from '../src/application';
import { createDatabaseConnection } from '../src/database/database.connection';
import {
  DEFAULT_ASSET_CATEGORIES,
  DEFAULT_ASSET_TAGS,
} from '../src/database/default-taxonomy';
import Database from 'better-sqlite3';

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

interface AssetPayload {
  id: string;
  name: string;
}

interface AssetListPayload {
  items: AssetPayload[];
  total: number;
}

interface CategoryPayload {
  id: string;
  name: string;
}

interface TagPayload {
  id: string;
  name: string;
  color: string | null;
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'asset-manager-e2e-'));
let app: NestFastifyApplication;
let server: FastifyInstance;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = join(temporaryDirectory, 'e2e.db');
  process.env.UPLOAD_DIR = join(temporaryDirectory, 'uploads');
  process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-with-enough-entropy';
  process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-with-enough-entropy';

  const connection = createDatabaseConnection();
  migrate(connection.db, {
    migrationsFolder: resolve(process.cwd(), 'drizzle'),
  });
  connection.client.close();

  app = await createApplication();
  await app.init();
  server = app.getHttpAdapter().getInstance() as FastifyInstance;
  await server.ready();
});

after(async () => {
  await app.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('注册、登录、资产隔离、折旧与 CSV 导出主流程', async () => {
  const owner = await register('owner@example.com', '资产主人');
  const ownerCategories = await getCategories(owner.accessToken);
  const ownerTags = await getTags(owner.accessToken);
  assert.deepEqual(
    ownerCategories.map((category) => category.name),
    DEFAULT_ASSET_CATEGORIES.map((category) => category.name),
  );
  assert.equal(ownerTags.length, DEFAULT_ASSET_TAGS.length);
  for (const expected of DEFAULT_ASSET_TAGS) {
    const actual = ownerTags.find((tag) => tag.name === expected.name);
    assert.ok(actual);
    assert.equal(actual.color, expected.color);
  }
  const loginResponse = await inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'owner@example.com', password: 'E2ePassword123!' },
  });
  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.json<AuthPayload>().user.id, owner.user.id);

  const createResponse = await inject({
    method: 'POST',
    url: '/api/assets',
    token: owner.accessToken,
    payload: {
      name: 'E2E 笔记本电脑',
      purchaseDate: '2025-01-01',
      purchasePriceCents: 1_200_000,
      residualValueCents: 120_000,
      usefulLifeMonths: 36,
      depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
      depreciationStartDate: '2025-01-01',
      status: AssetStatus.IN_USE,
    },
  });
  assert.equal(createResponse.statusCode, 201, createResponse.body);
  const asset = createResponse.json<AssetPayload>();

  const listResponse = await inject({
    method: 'GET',
    url: '/api/assets',
    token: owner.accessToken,
  });
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.json<AssetListPayload>().total, 1);

  const otherUser = await register('other@example.com', '其他用户');
  const otherCategories = await getCategories(otherUser.accessToken);
  const otherTags = await getTags(otherUser.accessToken);
  assert.equal(otherCategories.length, DEFAULT_ASSET_CATEGORIES.length);
  assert.equal(otherTags.length, DEFAULT_ASSET_TAGS.length);
  assert.equal(
    ownerCategories.some((ownerCategory) =>
      otherCategories.some(
        (otherCategory) => otherCategory.id === ownerCategory.id,
      ),
    ),
    false,
  );
  const modifyOtherCategory = await inject({
    method: 'PATCH',
    url: `/api/categories/${ownerCategories[0]!.id}`,
    token: otherUser.accessToken,
    payload: { name: '越权修改' },
  });
  assert.equal(modifyOtherCategory.statusCode, 404);
  const isolatedList = await inject({
    method: 'GET',
    url: '/api/assets',
    token: otherUser.accessToken,
  });
  assert.equal(isolatedList.json<AssetListPayload>().total, 0);
  const isolatedDetail = await inject({
    method: 'GET',
    url: `/api/assets/${asset.id}`,
    token: otherUser.accessToken,
  });
  assert.equal(isolatedDetail.statusCode, 404);

  const depreciation = await inject({
    method: 'GET',
    url: `/api/assets/${asset.id}/depreciation?asOfDate=2025-06-30`,
    token: owner.accessToken,
  });
  assert.equal(depreciation.statusCode, 200, depreciation.body);
  assert.ok(
    depreciation.json<{ accumulatedDepreciationCents: number }>()
      .accumulatedDepreciationCents > 0,
  );

  const csv = await inject({
    method: 'GET',
    url: '/api/exports/assets.csv',
    token: owner.accessToken,
  });
  assert.equal(csv.statusCode, 200);
  assert.match(csv.headers['content-type'] ?? '', /text\/csv/);
  assert.match(csv.body, /E2E 笔记本电脑/);
});

test('默认分类与标签迁移仅补齐对应列表为空的旧用户', () => {
  const directory = mkdtempSync(join(tmpdir(), 'asset-manager-taxonomy-'));
  const database = new Database(join(directory, 'legacy.db'));
  try {
    executeMigration(database, '0000_familiar_the_leader.sql');
    const insertUser = database.prepare(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
    );
    insertUser.run(
      '00000000-0000-4000-8000-000000000001',
      'empty@example.com',
      'hash',
      '空用户',
    );
    insertUser.run(
      '00000000-0000-4000-8000-000000000002',
      'category@example.com',
      'hash',
      '已有分类',
    );
    insertUser.run(
      '00000000-0000-4000-8000-000000000003',
      'tag@example.com',
      'hash',
      '已有标签',
    );
    database
      .prepare(
        'INSERT INTO asset_categories (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)',
      )
      .run(
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '自定义分类',
        0,
      );
    database
      .prepare(
        'INSERT INTO asset_tags (id, user_id, name, color) VALUES (?, ?, ?, ?)',
      )
      .run(
        '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000003',
        '自定义标签',
        '#123456',
      );

    executeMigration(database, '0001_default_taxonomy.sql');
    assertTaxonomyCounts(
      database,
      '00000000-0000-4000-8000-000000000001',
      11,
      6,
    );
    assertTaxonomyCounts(
      database,
      '00000000-0000-4000-8000-000000000002',
      1,
      6,
    );
    assertTaxonomyCounts(
      database,
      '00000000-0000-4000-8000-000000000003',
      11,
      1,
    );

    executeMigration(database, '0001_default_taxonomy.sql');
    assertTaxonomyCounts(
      database,
      '00000000-0000-4000-8000-000000000001',
      11,
      6,
    );
    const generatedIds = database
      .prepare(
        `SELECT id FROM asset_categories WHERE user_id = ?
         UNION ALL SELECT id FROM asset_tags WHERE user_id = ?`,
      )
      .all(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
      ) as Array<{ id: string }>;
    assert.ok(
      generatedIds.every(({ id }) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          id,
        ),
      ),
    );
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

async function register(
  email: string,
  displayName: string,
): Promise<AuthPayload> {
  const response = await inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, displayName, password: 'E2ePassword123!' },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json<AuthPayload>();
}

async function getCategories(token: string): Promise<CategoryPayload[]> {
  const response = await inject({
    method: 'GET',
    url: '/api/categories',
    token,
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json<CategoryPayload[]>();
}

async function getTags(token: string): Promise<TagPayload[]> {
  const response = await inject({ method: 'GET', url: '/api/tags', token });
  assert.equal(response.statusCode, 200, response.body);
  return response.json<TagPayload[]>();
}

async function inject(options: {
  method: 'GET' | 'POST' | 'PATCH';
  url: string;
  token?: string;
  payload?: object;
}): Promise<LightMyRequestResponse> {
  return server.inject({
    method: options.method,
    url: options.url,
    ...(options.token
      ? { headers: { authorization: `Bearer ${options.token}` } }
      : {}),
    ...(options.payload ? { payload: options.payload } : {}),
  });
}

function executeMigration(database: Database.Database, fileName: string): void {
  const sql = readFileSync(resolve(process.cwd(), 'drizzle', fileName), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) database.exec(statement);
  }
}

function assertTaxonomyCounts(
  database: Database.Database,
  userId: string,
  categories: number,
  tags: number,
): void {
  const categoryCount = database
    .prepare('SELECT count(*) AS count FROM asset_categories WHERE user_id = ?')
    .get(userId) as { count: number };
  const tagCount = database
    .prepare('SELECT count(*) AS count FROM asset_tags WHERE user_id = ?')
    .get(userId) as { count: number };
  assert.equal(categoryCount.count, categories);
  assert.equal(tagCount.count, tags);
}
