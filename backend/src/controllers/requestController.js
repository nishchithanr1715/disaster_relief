const { PrismaClient } = require('@prisma/client');
const { calculatePriority } = require('../utils/priorityEngine');
const prisma = new PrismaClient();

const createRequest = async (req, res) => {
  const { requestType, description, peopleCount, latitude, longitude, urgency } = req.body;
  const userId = req.user.userId;

  try {
    const victim = await prisma.victimProfile.findUnique({
      where: { userId }
    });

    if (!victim) {
      return res.status(404).json({ message: 'Victim profile not found' });
    }

    const priority = calculatePriority({ description, peopleCount, requestType, urgency });

    const request = await prisma.helpRequest.create({
      data: {
        victimId: victim.id,
        requestType,
        description,
        peopleCount: parseInt(peopleCount) || 1,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        priority,
        status: 'PENDING'
      }
    });

    // Notify coordinators via Socket.io (handled in index.js via exported io)
    const { io } = require('../../index');
    io.emit('new_help_request', request);

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating help request' });
  }
};

const getMyRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    const victim = await prisma.victimProfile.findUnique({
      where: { userId }
    });

    if (!victim) {
      return res.status(404).json({ message: 'Victim profile not found' });
    }

    const requests = await prisma.helpRequest.findMany({
      where: { victimId: victim.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await prisma.helpRequest.findMany({
      include: {
        victim: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all requests' });
  }
};

const updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const userId = req.user.userId;

  try {
    const oldRequest = await prisma.helpRequest.findUnique({ where: { id } });
    
    const request = await prisma.helpRequest.update({
      where: { id },
      data: { status }
    });

    // Log history
    await prisma.statusHistory.create({
      data: {
        requestId: id,
        changedBy: userId,
        oldStatus: oldRequest.status,
        newStatus: status,
        remarks
      }
    });

    // Notify relevant parties
    const { io } = require('../../index');
    io.emit('request_status_updated', request);

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating request status' });
  }
};

module.exports = { createRequest, getMyRequests, getAllRequests, updateRequestStatus };
