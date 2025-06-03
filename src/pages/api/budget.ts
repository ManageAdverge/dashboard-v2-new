import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prisma';

interface BudgetRow {
  id: number;
  type: string;
  values: { [key: string]: string };
}

interface Budget {
  id: string;
  type: string;
  month: string;
  value: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GlobalSettings {
  id: string;
  googleAdsAccountIds: string[];
  selectedGoogleAdsAccountId: string[];
  targetFocus: string | null;
  conversionTarget: number | null;
  conversionValueTarget: number | null;
  roasTarget: number | null;
  currency: string;
  createdAt: Date;
  clientName: string | null;
}

interface TransactionResult {
  budgets: Budget[];
  settings: GlobalSettings;
}

const parseFormattedNumber = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  return parseFloat(value.replace(/,/g, '')) || 0;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has admin role for modifications
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get all global budgets
      const budgets = await prisma.globalBudget.findMany({
        orderBy: { type: 'asc' },
      });

      // Get the latest global settings
      const latestSettings = await prisma.globalSettings.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      // Transform the data into the format expected by the frontend
      const budgetData = budgets.reduce((acc: { [key: string]: BudgetRow }, budget) => {
        if (!acc[budget.type]) {
          acc[budget.type] = {
            id: Object.keys(acc).length + 1,
            type: budget.type,
            values: {},
          };
        }
        acc[budget.type].values[budget.month] = budget.value.toFixed(2);
        return acc;
      }, {});

      return res.json({
        rows: Object.values(budgetData),
        currency: latestSettings?.currency || 'USD'
      });
    }

    if (req.method === 'PUT') {
      // Only admins can modify budgets
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can modify global budgets' });
      }
      
      const { rows, currency = 'USD' } = req.body as { rows: BudgetRow[]; currency?: string };

      if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'Invalid budget data format' });
      }

      const validRows = rows.filter(row => row.type.trim() !== '');

      if (validRows.length === 0) {
        return res.status(400).json({ error: 'No valid budget rows provided' });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Get the latest global settings
          let currentSettings = await tx.globalSettings.findFirst({
            orderBy: { updatedAt: 'desc' }
          });

          // Only update currency if it changed
          if (!currentSettings) {
            currentSettings = await tx.globalSettings.create({
              data: {
                currency,
                googleAdsAccountIds: [],
                selectedGoogleAdsAccountId: [],
                targetFocus: 'conversion',
                conversionTarget: null,
                cpaTarget: null,
                conversionValueTarget: null,
                roasTarget: null,
                clientName: null
              }
            });
          } else if (currentSettings.currency !== currency) {
            currentSettings = await tx.globalSettings.update({
              where: { id: currentSettings.id },
              data: { currency },
            });
          }

          // Delete all existing global budgets
          await tx.globalBudget.deleteMany();

          // Prepare budget entries
          const budgetEntries = validRows.flatMap((row) => 
            Object.entries(row.values).map(([month, value]) => ({
              type: row.type.trim(),
              month,
              value: parseFormattedNumber(value),
              currency: currentSettings.currency,
            }))
          );

          // Create new global budgets
          await tx.globalBudget.createMany({
            data: budgetEntries,
          });

          // Fetch all budgets
          const budgets = await tx.globalBudget.findMany({
            orderBy: { type: 'asc' },
          }) as Budget[];

          return {
            budgets,
            settings: currentSettings as GlobalSettings
          } as TransactionResult;
        });

        // Transform the response to match the frontend format
        const responseData = result.budgets.reduce((acc: { [key: string]: BudgetRow }, budget) => {
          if (!acc[budget.type]) {
            acc[budget.type] = {
              id: Object.keys(acc).length + 1,
              type: budget.type,
              values: {},
            };
          }
          acc[budget.type].values[budget.month] = budget.value.toFixed(2);
          return acc;
        }, {});

        return res.json({
          rows: Object.values(responseData),
          currency: result.settings.currency
        });
      } catch (txError) {
        console.error('Transaction error:', txError);
        return res.status(500).json({ error: 'Failed to update budgets' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Budget API error:', error);
    return res.status(500).json({ error: 'Failed to process budget data' });
  }
} 