import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleAdsApi } from 'google-ads-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Use the MCC account to fetch all client accounts
    const mccCustomer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    const query = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      WHERE customer.status = 'ENABLED'
      ORDER BY customer.descriptive_name ASC
    `;

    const response = await mccCustomer.query(query);
    
    const accounts = response.map((row: any) => ({
      id: row.customer.id,
      name: row.customer.descriptive_name,
      currency: row.customer.currency_code,
      timeZone: row.customer.time_zone,
    }));

    return res.status(200).json(accounts);
  } catch (error) {
    console.error('Error fetching Google Ads accounts:', error);
    return res.status(500).json({ message: 'Failed to fetch Google Ads accounts' });
  }
} 