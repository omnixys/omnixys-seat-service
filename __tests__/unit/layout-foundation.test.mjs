import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { TableMapper } from '../../dist/table/models/mappers/table.mapper.js';
import { LayoutMutationResolver } from '../../dist/layout/resolvers/layout-mutation.resolver.js';
import { TablePayload } from '../../dist/table/models/payloads/table.payload.js';
import { SectionPayload } from '../../dist/section/models/payloads/section.payload.js';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage.js';

test('table payload preserves actual dimensions and absent dimensions', () => {
  const table = { id: 'table', width: 230, height: 75, meta: { label: 'A' } };
  assert.equal(TableMapper.toPayload(table).width, 230);
  assert.equal(TableMapper.toPayload(table).height, 75);
  assert.equal(TableMapper.toPayload({ ...table, width: null }).width, undefined);
  assert.equal(TableMapper.toPayload({ ...table, height: null }).height, undefined);
});

test('move operations expose the concrete moved object payload', async () => {
  LazyMetadataStorage.load([LayoutMutationResolver]);
  const mutations = TypeMetadataStorage.getMutationsMetadata();
  assert.equal(mutations.find((entry) => entry.methodName === 'moveTable').typeFn(), TablePayload);
  assert.equal(mutations.find((entry) => entry.methodName === 'moveSection').typeFn(), SectionPayload);
  const calls = [];
  const resolver = new LayoutMutationResolver({
    async moveTable(input, actor) { calls.push({ input, actor }); return { id: input.id, sectionId: 'section' }; },
    async moveSection(input, actor) { calls.push({ input, actor }); return { id: input.id, name: 'Hall' }; },
  }, { log: () => ({ debug() {} }) });
  assert.deepEqual(await resolver.moveTable({ id: 'table', x: 1, y: 2 }, { id: 'actor' }), { id: 'table', sectionId: 'section' });
  assert.deepEqual(await resolver.moveSection({ id: 'section', x: 3, y: 4 }, { id: 'actor' }), { id: 'section', name: 'Hall' });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.actor === 'actor'));
});
