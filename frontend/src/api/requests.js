import api from './auth';

export const createHelpRequest = async (requestData) => {
  const response = await api.post('/requests', requestData);
  return response.data;
};

export const getMyRequests = async () => {
  const response = await api.get('/requests/my');
  return response.data;
};

export const getAllRequests = async () => {
  const response = await api.get('/requests/all');
  return response.data;
};

export const updateRequestStatus = async (id, statusData) => {
  const response = await api.patch(`/requests/${id}/status`, statusData);
  return response.data;
};

export const relayOfflineRequest = async (relayData) => {
  const response = await api.post('/requests/relay', relayData);
  return response.data;
};
