const express = require('express');
const { getResources, addResource, updateResource } = require('../controllers/resourceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getResources);
router.post('/', authenticate, authorize(['NGO_ADMIN']), addResource);
router.patch('/:id', authenticate, authorize(['NGO_ADMIN']), updateResource);

module.exports = router;
