const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getMessages = async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { name: true, role: true }
        }
      }
    });
    // Send in chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

module.exports = { getMessages };
