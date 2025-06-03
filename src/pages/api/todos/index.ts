import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET /api/todos - List all todos for the current user
  if (req.method === 'GET') {
    try {
      const todos = await prisma.todo.findMany({
        where: {
          userId: (session.user as any).id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(todos);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch todos' });
    }
  }

  // POST /api/todos - Create a new todo
  if (req.method === 'POST') {
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    try {
      const todo = await prisma.todo.create({
        data: {
          title,
          userId: (session.user as any).id,
        },
      });

      return res.status(201).json(todo);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create todo' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 