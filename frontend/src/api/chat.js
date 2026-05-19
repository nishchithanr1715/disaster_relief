import api from './auth';

export const getMessages = async () => {
  const response = await api.get('/chat');
  return response.data;
};
