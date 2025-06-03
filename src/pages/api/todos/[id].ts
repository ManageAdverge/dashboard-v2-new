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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid todo ID' });
  }

  // GET /api/todos/[id] - Get a specific todo
  if (req.method === 'GET') {
    try {
      const todo = await prisma.todo.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      // Only allow users to access their own todos
      if (todo.userId !== (session.user as any).id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.status(200).json(todo);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch todo' });
    }
  }

  // PUT /api/todos/[id] - Update a todo
  if (req.method === 'PUT') {
    const { title, completed } = req.body;

    try {
      const todo = await prisma.todo.findUnique({
        where: { id },
      });

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      // Only allow users to update their own todos
      if (todo.userId !== (session.user as any).id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: {
          title,
          completed,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json(updatedTodo);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update todo' });
    }
  }

  // DELETE /api/todos/[id] - Delete a todo
  if (req.method === 'DELETE') {
    try {
      const todo = await prisma.todo.findUnique({
        where: { id },
      });

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      // Only allow users to delete their own todos
      if (todo.userId !== (session.user as any).id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.todo.delete({
        where: { id },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete todo' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 