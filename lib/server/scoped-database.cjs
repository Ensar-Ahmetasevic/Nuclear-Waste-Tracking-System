const { AsyncLocalStorage } = require('node:async_hooks');
const { Prisma } = require('@prisma/client');
const { HttpError } = require('./errors.cjs');

const requestDatabase = new AsyncLocalStorage();
const models = new Map(Prisma.dmmf.datamodel.models.map(model => [
  model.name[0].toLowerCase() + model.name.slice(1), model,
]));
const reads = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy']);
const writes = new Set(['create', 'update', 'delete']);

// All business access must use a scoped transaction. There is deliberately no
// fallback to the unrestricted client, including outside an HTTP request.
const prisma = new Proxy({}, {
  get(_target, property) {
    const scoped = requestDatabase.getStore();
    if (!scoped) throw new Error('Business database access requires an authenticated organization');
    return scoped[property];
  },
});

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}

async function validateData(tx, model, data, organizationId, creating) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid record');
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const field = model.fields.find(item => item.name === key);
    if (!field || field.kind === 'object' || ['id', 'organizationId'].includes(key)) {
      throw new HttpError(400, `Field ${key} cannot be changed`);
    }
    if (value === undefined) continue;
    if (value === null) {
      if (field.isRequired) throw new HttpError(400, `${key} is required`);
    } else if (field.type === 'Int' || field.type === 'Float') {
      if (!Number.isFinite(value) || (field.type === 'Int' && (!Number.isInteger(value) || Math.abs(value) > 2147483647))) {
        throw new HttpError(400, `${key} must be a valid number`);
      }
      if (key.endsWith('Id') && !positiveInteger(value)) throw new HttpError(400, `Invalid ${key}`);
      if (/quantity|capacity|surfaceArea|footprint|volume|depth/i.test(key) && value <= 0 && !(key === 'quantity' && model.name === 'FinalStorageLocation' && value === 0)) {
        throw new HttpError(400, `${key} must be positive`);
      }
      if (/radiation|pressure/i.test(key) && value < 0) throw new HttpError(400, `${key} cannot be negative`);
      if (/humidity/i.test(key) && (value < 0 || value > 100)) throw new HttpError(400, `${key} must be between 0 and 100`);
    } else if (field.type === 'String') {
      if (typeof value !== 'string' || !value.trim() || value.length > 10000) throw new HttpError(400, `Invalid ${key}`);
    } else if (field.type === 'Boolean' && typeof value !== 'boolean') {
      throw new HttpError(400, `Invalid ${key}`);
    } else if (field.type === 'DateTime' && !Number.isFinite(new Date(value).getTime())) {
      throw new HttpError(400, `Invalid ${key}`);
    }
    const statuses = { truckStatus: ['IN', 'OUT'], status: ['pending', 'accepted', 'rejected'], containerStatus: ['pending', 'accepted', 'rejected'], preStorageStatus: ['pending', 'accepted', 'rejected', 'completed'], finalStorageStatus: ['requestPending', 'transportPending', 'requestRejected', 'accepted', 'rejected'] };
    if (statuses[key] && !statuses[key].includes(value)) throw new HttpError(400, `Invalid ${key}`);
    result[key] = value;
  }
  if (creating) {
    for (const field of model.fields) {
      if (field.kind !== 'object' && field.isRequired && !field.hasDefaultValue && field.name !== 'organizationId' && result[field.name] == null) {
        throw new HttpError(400, `${field.name} is required`);
      }
    }
  }
  for (const relation of model.fields.filter(field => field.kind === 'object' && field.relationFromFields?.length)) {
    const foreignKey = relation.relationFromFields[0];
    if (foreignKey === 'organizationId' || result[foreignKey] == null) continue;
    const delegate = relation.type[0].toLowerCase() + relation.type.slice(1);
    const target = await tx[delegate].findFirst({ where: { id: result[foreignKey], organizationId }, select: { id: true } });
    if (!target) throw new HttpError(404, 'Related record not found');
  }
  return result;
}

function createScopedDatabase(tx, organizationId) {
  if (!positiveInteger(organizationId)) throw new HttpError(403, 'Organization access is required');
  return new Proxy({}, {
    get(_target, name) {
      const model = models.get(name);
      if (!model || !model.fields.some(field => field.name === 'organizationId') || ['Organization', 'UserProfile'].includes(model.name)) throw new Error(`Unavailable business model: ${String(name)}`);
      return new Proxy({}, {
        get(_delegate, operation) {
          if (!reads.has(operation) && !writes.has(operation)) throw new Error(`Unsupported scoped operation: ${String(operation)}`);
          return async (args = {}) => {
            const scoped = { ...args };
            if (operation !== 'create') {
              scoped.where = { ...args.where, organizationId };
              if (['findUnique', 'findUniqueOrThrow', 'update', 'delete'].includes(operation) && !positiveInteger(args.where?.id)) {
                throw new HttpError(400, 'Invalid record ID');
              }
            }
            if (operation === 'create' || operation === 'update') {
              scoped.data = await validateData(tx, model, args.data, organizationId, operation === 'create');
              if (operation === 'create') scoped.data.organizationId = organizationId;
            }
            return tx[name][operation === 'findUnique' ? 'findUniqueOrThrow' : operation](scoped);
          };
        },
      });
    },
  });
}

module.exports = { prisma, requestDatabase, createScopedDatabase, positiveInteger };
