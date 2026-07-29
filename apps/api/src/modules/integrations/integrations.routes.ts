import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { generateEInvoice } from './einvoice.service.js';
import { generateEway } from './eway.service.js';
import { sendWhatsApp, listWhatsApp } from './whatsapp.service.js';
import { config } from '../../config.js';

export const integrationsRouter: Router = Router();

const ctxOf = (req: import('express').Request) => ({ companyId: req.session!.companyId, userId: req.session!.userId, requestId: req.requestId });

/** POST /gst/e-invoice/generate { voucherId } — fetch IRN + signed QR from the IRP. */
integrationsRouter.post('/gst/e-invoice/generate', requireAuth, requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    const { voucherId } = z.object({ voucherId: z.string().min(1) }).parse(req.body);
    ok(res, await generateEInvoice(voucherId, ctxOf(req)));
  }));

const ewaySchema = z.object({
  voucherId: z.string().optional(),
  invoiceNo: z.string().min(1), party: z.string().min(1),
  from: z.string().min(1), to: z.string().min(1),
  distance: z.number().int().min(0), value: z.number().min(0),
  vehicleNo: z.string().optional(), transportMode: z.string().optional(),
});

/** POST /gst/e-way/generate — generate an EWB number from the NIC portal. */
integrationsRouter.post('/gst/e-way/generate', requireAuth, requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    ok(res, await generateEway(ewaySchema.parse(req.body), ctxOf(req)));
  }));

const waSchema = z.object({
  to: z.string().min(6), toName: z.string().optional(),
  kind: z.string().optional(), body: z.string().min(1), docUrl: z.string().optional(),
  attachVoucherId: z.string().optional(),
});

/** POST /whatsapp/send — send a text/document via WhatsApp. */
integrationsRouter.post('/whatsapp/send', requireAuth, requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    ok(res, await sendWhatsApp(waSchema.parse(req.body), ctxOf(req)));
  }));

/** GET /whatsapp/messages — sent-message log. */
integrationsRouter.get('/whatsapp/messages', requireAuth, requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    ok(res, await listWhatsApp(req.session!.companyId));
  }));

/** GET /integrations/status — which providers are live vs sandbox (for the UI badge). */
integrationsRouter.get('/integrations/status', requireAuth,
  asyncHandler(async (_req, res) => {
    ok(res, {
      einvoice: config.integrations.einvoice.mode,
      eway: config.integrations.eway.mode,
      whatsapp: config.integrations.whatsapp.mode,
    });
  }));
