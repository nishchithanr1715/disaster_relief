import api from './auth';

export const getResources = async () => {
  const response = await api.get('/resources');
  return response.data;
};

export const addResource = async (resourceData) => {
  const response = await api.post('/resources', resourceData);
  return response.data;
};

export const updateResource = async (id, resourceData) => {
  const response = await api.patch(`/resources/${id}`, resourceData);
  return response.data;
};
