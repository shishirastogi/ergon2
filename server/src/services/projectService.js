import { prisma } from '../db.js';
import { badRequest, notFound } from '../utils/httpError.js';
import {
  oneOf,
  optionalDate,
  optionalString,
  positiveNumber,
  requireString,
} from '../utils/validate.js';
import { serializeProject } from '../serializers/index.js';

/**
 * Project service. All queries are scoped through `client.userId` so one user
 * can never read or mutate another user's projects (single-tenant today,
 * multi-user-safe tomorrow).
 */

const PROJECT_INCLUDE = {
  client: true,
  quotes: { orderBy: { createdAt: 'desc' } },
  invoices: { orderBy: { createdAt: 'desc' } },
};

const PROJECT_STATUSES = ['LEAD', 'QUOTE_SENT', 'IN_PROGRESS', 'REVISIONS', 'DELIVERED', 'PAID'];

function validateProjectInput(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.title !== undefined) {
    data.title = requireString(body.title, 'title', { max: 200 });
  }
  const status = oneOf(
    body.status !== undefined ? body.status : body.stage, // accept both spellings
    'status',
    PROJECT_STATUSES
  );
  if (status !== undefined) data.status = status;
  if (body.quotedAmount !== undefined) {
    if (body.quotedAmount === null || body.quotedAmount === '') {
      data.quotedAmount = null;
    } else {
      // Money fields go in as Decimal-safe values; 0 allowed for unquoted projects.
      data.quotedAmount = positiveNumber(body.quotedAmount, 'quotedAmount', {
        allowZero: true,
      });
    }
  }
  if (body.hoursLogged !== undefined) {
    data.hoursLogged = positiveNumber(body.hoursLogged, 'hoursLogged', {
      allowZero: true,
      max: 100000,
    });
  }
  if (body.notes !== undefined) data.notes = optionalString(body.notes, 'notes', { max: 5000 });
  if (body.startDate !== undefined) data.startDate = optionalDate(body.startDate, 'startDate');
  if (body.deadline !== undefined) data.deadline = optionalDate(body.deadline, 'deadline');
  return data;
}

export async function listProjects(userId) {
  const projects = await prisma.project.findMany({
    where: { client: { userId } },
    orderBy: { createdAt: 'desc' },
    include: {
      client: true,
      quotes: { orderBy: { createdAt: 'desc' }, include: { invoice: true } },
      invoices: { orderBy: { createdAt: 'desc' }, include: { quote: true } },
    },
  });
  return projects.map((p) => serializeProject(p));
}

export async function createProject(userId, body) {
  if (!body.clientId || typeof body.clientId !== 'string') {
    throw badRequest("'clientId' is required");
  }
  const client = await prisma.client.findFirst({ where: { id: body.clientId, userId } });
  if (!client) throw notFound('Client not found');

  const data = validateProjectInput(body);
  if (!data.title) throw new Error('unreachable'); // guarded by validateProjectInput

  const project = await prisma.project.create({
    data: { ...data, clientId: client.id },
    include: PROJECT_INCLUDE,
  });
  return serializeProject(project);
}

async function getOwnedProjectOrThrow(userId, projectId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { userId } },
    include: PROJECT_INCLUDE,
  });
  if (!project) throw notFound('Project not found');
  return project;
}

export async function getProject(userId, projectId) {
  const project = await getOwnedProjectOrThrow(userId, projectId);
  return serializeProject(project);
}

export async function updateProject(userId, projectId, body) {
  await getOwnedProjectOrThrow(userId, projectId);
  const data = validateProjectInput(body, { partial: true });

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    include: PROJECT_INCLUDE,
  });
  return serializeProject(project);
}

export async function deleteProject(userId, projectId) {
  await getOwnedProjectOrThrow(userId, projectId);
  await prisma.project.delete({ where: { id: projectId } }); // cascades via schema
  return { success: true };
}
