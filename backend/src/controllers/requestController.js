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

    const priority = await calculatePriority({ description, peopleCount, requestType, urgency });

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

    // Notify coordinators via Socket.io with full victim details included
    const fullRequest = await prisma.helpRequest.findUnique({
      where: { id: request.id },
      include: {
        victim: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      }
    });
    const { io } = require('../../index');
    io.emit('new_help_request', fullRequest);

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

    // Fetch full request details and updater details for a rich socket notification payload
    const fullRequest = await prisma.helpRequest.findUnique({
      where: { id: request.id },
      include: {
        victim: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      }
    });

    const updaterUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true }
    });

    const socketPayload = {
      ...fullRequest,
      updater: updaterUser
    };

    // Notify relevant parties
    const { io } = require('../../index');
    io.emit('request_status_updated', socketPayload);

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating request status' });
  }
};

const relayOfflineRequest = async (req, res) => {
  const { senderName, description, peopleCount, latitude, longitude, urgency, hops, relayChain } = req.body;
  const updaterUserId = req.user.userId; // The volunteer or NGO admin who is relaying it

  try {
    // Find victim profile by senderName
    let victimId;
    const matchedUser = await prisma.user.findFirst({
      where: { name: senderName, role: 'VICTIM' },
      include: { victimProfile: true }
    });

    if (matchedUser && matchedUser.victimProfile) {
      victimId = matchedUser.victimProfile.id;
    } else {
      // Fallback: Find the first victim profile in database
      const firstVictim = await prisma.victimProfile.findFirst();
      if (firstVictim) {
        victimId = firstVictim.id;
      } else {
        return res.status(400).json({ message: 'No active victim profiles found to bind relay' });
      }
    }

    // Deduplicate: check if there's already a pending/assigned request at these exact coordinates
    const existing = await prisma.helpRequest.findFirst({
      where: {
        victimId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        status: 'PENDING'
      }
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    // Create the help request
    const request = await prisma.helpRequest.create({
      data: {
        victimId,
        requestType: 'rescue',
        description,
        peopleCount: parseInt(peopleCount) || 1,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        priority: 'CRITICAL',
        status: 'PENDING',
        isOfflineRelayed: true,
        offlineSenderName: senderName,
        relayHops: parseInt(hops) || 1,
        relayChain: JSON.stringify(relayChain)
      }
    });

    // Notify coordinators via Socket.io with full details included
    const fullRequest = await prisma.helpRequest.findUnique({
      where: { id: request.id },
      include: {
        victim: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      }
    });

    const { io } = require('../../index');
    io.emit('new_help_request', fullRequest);

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error relaying offline request' });
  }
};

module.exports = { createRequest, getMyRequests, getAllRequests, updateRequestStatus, relayOfflineRequest };
