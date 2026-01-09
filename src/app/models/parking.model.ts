export interface Parking {
  id?: string;
  name: string;
  city: 'paris' | 'strasbourg' | 'toulouse';
  position: {
    lat: number;
    lon: number;
  };
  address?: string;
  availablePlaces?: number;
  totalCapacity?: number;
  status?: string;
}
