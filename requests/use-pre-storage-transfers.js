import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
export default function usePreStorageTransfers() {
  return useQuery({queryKey:['preStorageTransfers'], queryFn: async () => (await axios.get('/api/pre-storage-setup/transfers')).data.finalStorageLocationData});
}
