const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getResources = async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        ngo: true
      }
    });
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching resources' });
  }
};

const addResource = async (req, res) => {
  const { resourceType, quantityAvailable, unit, location } = req.body;
  const userId = req.user.userId;

  try {
    const ngo = await prisma.nGOProfile.findUnique({
      where: { userId }
    });

    if (!ngo) {
      return res.status(404).json({ message: 'NGO profile not found' });
    }

    const resource = await prisma.resource.create({
      data: {
        ngoId: ngo.id,
        resourceType,
        quantityAvailable: parseFloat(quantityAvailable),
        unit,
        location
      }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding resource' });
  }
};

const updateResource = async (req, res) => {
  const { id } = req.params;
  const { quantityAvailable } = req.body;

  try {
    const resource = await prisma.resource.update({
      where: { id },
      data: { quantityAvailable: parseFloat(quantityAvailable) }
    });

    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating resource' });
  }
};

module.exports = { getResources, addResource, updateResource };
