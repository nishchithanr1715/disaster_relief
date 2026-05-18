const express = require('express');
const { createRequest, getMyRequests, getAllRequests, updateRequestStatus } = require('../controllers/requestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticate, authorize(['VICTIM']), createRequest);
router.get('/my', authenticate, authorize(['VICTIM']), getMyRequests);
router.get('/all', authenticate, authorize(['NGO_ADMIN', 'VOLUNTEER']), getAllRequests);
router.patch('/:id/status', authenticate, authorize(['NGO_ADMIN', 'VOLUNTEER']), updateRequestStatus);

module.exports = router;
