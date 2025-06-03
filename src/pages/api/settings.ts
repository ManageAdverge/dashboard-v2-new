import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prisma';

const parseFormattedNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  // Handle both string numbers with commas and already parsed numbers
  return typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get or create the global settings row
    let settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: {
          id: 'global',
          googleAdsAccountIds: [],
          selectedGoogleAdsAccountId: [],
          microsoftAdsAccountIds: [],
          selectedMicrosoftAdsAccountId: [],
          clientName: null,
          targetFocus: 'conversion',
          conversionTarget: null,
          cpaTarget: null,
          conversionValueTarget: null,
          roasTarget: null,
          currency: 'USD',
        },
      });
    }

    if (req.method === 'GET') {
      return res.json(settings);
    }

    if (req.method === 'POST') {
      const isAdmin = session.user.role === 'ADMIN';
      // Only allow admins to update account IDs and clientName
      const adminFields = isAdmin ? {
        googleAdsAccountIds: req.body.googleAdsAccountIds ?? settings.googleAdsAccountIds,
        selectedGoogleAdsAccountId: req.body.selectedGoogleAdsAccountId ?? settings.selectedGoogleAdsAccountId,
        microsoftAdsAccountIds: req.body.microsoftAdsAccountIds ?? settings.microsoftAdsAccountIds,
        selectedMicrosoftAdsAccountId: req.body.selectedMicrosoftAdsAccountId ?? settings.selectedMicrosoftAdsAccountId,
        clientName: req.body.clientName ?? settings.clientName,
        currency: req.body.currency ?? settings.currency,
      } : {};
      // All users can update targets
      const targetFields = {
        targetFocus: req.body.targetFocus ?? settings.targetFocus,
        conversionTarget: req.body.conversionTarget !== undefined ? parseFormattedNumber(req.body.conversionTarget) : settings.conversionTarget,
        cpaTarget: req.body.cpaTarget !== undefined ? parseFormattedNumber(req.body.cpaTarget) : settings.cpaTarget,
        conversionValueTarget: req.body.conversionValueTarget !== undefined ? parseFormattedNumber(req.body.conversionValueTarget) : settings.conversionValueTarget,
        roasTarget: req.body.roasTarget !== undefined ? parseFormattedNumber(req.body.roasTarget) : settings.roasTarget,
      };
      const mergedSettings = { ...adminFields, ...targetFields };
      const updated = await prisma.globalSettings.update({
        where: { id: 'global' },
        data: mergedSettings,
      });
      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Failed to process settings data' });
  }
} 