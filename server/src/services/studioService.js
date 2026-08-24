import { prisma } from '../db.js';
import { conflict, notFound } from '../utils/httpError.js';
import { optionalString, requireString } from '../utils/validate.js';
import { iso } from '../serializers/index.js';

/**
 * Studio service — CRUD for studio profiles (the issuer identity shown on
 * quotes/invoices). Scoped per user; max 5 studios per user (matches the
 * frontend's StudioContext limit).
 */

const MAX_STUDIOS_PER_USER = 5;

function validateStudioInput(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = requireString(body.name, 'name', { max: 160 });
  }
  if (body.tagline !== undefined) data.tagline = optionalString(body.tagline, 'tagline', { max: 300 });
  if (body.email !== undefined) data.email = optionalString(body.email, 'email', { max: 320 });
  if (body.phone !== undefined) data.phone = optionalString(body.phone, 'phone', { max: 40 });
  if (body.website !== undefined) data.website = optionalString(body.website, 'website', { max: 300 });
  if (body.address !== undefined) data.address = optionalString(body.address, 'address', { max: 500 });
  if (body.logoUrl !== undefined) data.logoUrl = optionalString(body.logoUrl, 'logoUrl', { max: 1000 });
  if (body.currency !== undefined) {
    // ISO-4217 alpha-3, stored uppercase.
    data.currency = body.currency
      ? String(body.currency).trim().toUpperCase().slice(0, 3)
      : null;
  }
  if (body.taxId !== undefined) data.taxId = optionalString(body.taxId, 'taxId', { max: 60 });
  return data;
}

export function serializeStudio(studio) {
  return {
    id: studio.id,
    name: studio.name,
    tagline: studio.tagline ?? '',
    email: studio.email ?? '',
    phone: studio.phone ?? '',
    website: studio.website ?? '',
    address: studio.address ?? '',
    logoUrl: studio.logoUrl ?? '',
    currency: studio.currency ?? 'INR',
    taxId: studio.taxId ?? '',
    createdAt: iso(studio.createdAt),
    updatedAt: iso(studio.updatedAt),
  };
}

export async function listStudios(userId) {
  const studios = await prisma.studio.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return studios.map(serializeStudio);
}

async function getOwnedStudioOrThrow(userId, studioId) {
  const studio = await prisma.studio.findFirst({ where: { id: studioId, userId } });
  if (!studio) throw notFound('Studio not found');
  return studio;
}

export async function getStudio(userId, studioId) {
  return serializeStudio(await getOwnedStudioOrThrow(userId, studioId));
}

export async function createStudio(userId, body) {
  const count = await prisma.studio.count({ where: { userId } });
  if (count >= MAX_STUDIOS_PER_USER) {
    throw conflict(`Studio limit reached. You can create a maximum of ${MAX_STUDIOS_PER_USER} studios.`);
  }

  const data = validateStudioInput(body);
  const studio = await prisma.studio.create({ data: { ...data, userId } });

  // Keep the legacy users.studioName in sync with the primary studio so
  // older views and the PDF footer stay meaningful.
  if (count === 0) {
    await prisma.user
      .update({ where: { id: userId }, data: { studioName: studio.name } })
      .catch(() => {});
  }
  return serializeStudio(studio);
}

export async function updateStudio(userId, studioId, body) {
  await getOwnedStudioOrThrow(userId, studioId);
  const data = validateStudioInput(body, { partial: true });
  const studio = await prisma.studio.update({ where: { id: studioId }, data });
  return serializeStudio(studio);
}

export async function deleteStudio(userId, studioId) {
  await getOwnedStudioOrThrow(userId, studioId);
  await prisma.studio.delete({ where: { id: studioId } });
  return { success: true };
}
