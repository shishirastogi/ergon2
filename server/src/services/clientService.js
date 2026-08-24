import { prisma } from '../db.js';
import { conflict, notFound } from '../utils/httpError.js';
import {
  email as normalizeEmail,
  oneOf,
  optionalString,
  requireString,
} from '../utils/validate.js';
import { serializeClient } from '../serializers/index.js';

/**
 * Client service.
 *
 * Delete policy (per ergon-database.md §5): deleting a Client is BLOCKED with
 * 409 if any of its projects carries an invoice whose stored status is PAID
 * (financial records must survive); otherwise the delete cascades through
 * Projects → Quotes/Invoices → LineItems at the DB level (schema onDelete).
 */

const CLIENT_INCLUDE = {
  projects: { include: { invoices: true } },
};

function validateClientInput(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = requireString(body.name, 'name', { max: 160 });
  }
  if (body.email !== undefined) data.email = normalizeEmail(body.email);
  if (body.phone !== undefined) data.phone = optionalString(body.phone, 'phone', { max: 40 });
  if (body.company !== undefined) {
    data.company = optionalString(body.company, 'company', { max: 160 });
  }
  if (body.notes !== undefined) data.notes = optionalString(body.notes, 'notes', { max: 5000 });
  const status = oneOf(body.status, 'status', ['LEAD', 'ACTIVE', 'PAST']);
  if (status !== undefined) data.status = status;
  return data;
}

/** List all clients for a user, newest first, each with its projects attached. */
export async function listClients(userId) {
  const clients = await prisma.client.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: CLIENT_INCLUDE,
  });
  return clients.map((c) => serializeClient(c, { includeProjects: true }));
}

export async function createClient(userId, body) {
  const data = validateClientInput(body);
  if (!data.name) throw new Error('unreachable'); // guarded by validateClientInput

  const client = await prisma.client.create({
    data: { ...data, userId },
    include: CLIENT_INCLUDE,
  });
  return serializeClient(client, { includeProjects: true });
}

async function getOwnedClientOrThrow(userId, clientId) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    include: CLIENT_INCLUDE,
  });
  if (!client) throw notFound('Client not found');
  return client;
}

export async function getClient(userId, clientId) {
  const client = await getOwnedClientOrThrow(userId, clientId);
  return serializeClient(client, { includeProjects: true });
}

export async function updateClient(userId, clientId, body) {
  await getOwnedClientOrThrow(userId, clientId); // existence + ownership check
  const data = validateClientInput(body, { partial: true });

  const client = await prisma.client.update({
    where: { id: clientId },
    data,
    include: CLIENT_INCLUDE,
  });
  return serializeClient(client, { includeProjects: true });
}

export async function deleteClient(userId, clientId) {
  const client = await getOwnedClientOrThrow(userId, clientId);

  const paidInvoices = client.projects.reduce(
    (count, p) => count + p.invoices.filter((inv) => inv.status === 'PAID').length,
    0
  );
  if (paidInvoices > 0) {
    throw conflict('This client has PAID invoices; deleting it would destroy financial records');
  }

  await prisma.client.delete({ where: { id: clientId } }); // cascades via schema
  return { success: true };
}
